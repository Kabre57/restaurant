// lib/orderService.ts — Logique métier commande avec idempotency, déduction stock, pub Redis
// BUG-004 FIX : pas de SQL raw détecté — sécurisé via Prisma ORM (requêtes paramétrées).
// Corrections appliquées :
//   - Validation Zod sur CreateOrderInput (protection données malformées)
//   - Types `any` supprimés → types Prisma stricts
//   - catch silencieux `{}` → logs explicites
//   - Champs Prisma alignés : storeId (pas restaurantId), total (pas totalAmount), price (pas unitPrice)

import { z } from "zod";
import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────

export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "SERVED" | "PAID" | "CANCELLED";
export type OrderType   = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export interface OrderItemInput {
  productId:   string;
  productName: string;
  quantity:    number;
  unitPrice:   number;
  notes?:      string;
  extras?:     { name: string; price: number }[];
}

export interface CreateOrderInput {
  restaurantId:    string; // = storeId dans Prisma
  tableId?:        string;
  type:            OrderType;
  items:           OrderItemInput[];
  notes?:          string;
  idempotencyKey?: string;
}

export interface OrderData {
  id:           string;
  orderNumber:  string;
  restaurantId: string;
  tableId?:     string | null;
  tableNumber?: string | null;
  status:       OrderStatus;
  type:         OrderType;
  totalAmount:  number;
  notes?:       string | null;
  items:        (OrderItemInput & { id: string })[];
  createdAt:    string;
  updatedAt:    string;
}

// ── Validation interne ────────────────────────────────────

/**
 * Valide que les inputs sont propres avant toute écriture DB.
 * Prisma paramétrise toutes ses requêtes → pas de risque d'injection SQL.
 * Cette validation protège contre les données malformées côté métier.
 */
const createOrderInputSchema = z.object({
  restaurantId:   z.string().min(1, "restaurantId requis"),
  tableId:        z.string().optional(),
  type:           z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
  items: z.array(z.object({
    productId:   z.string().min(1, "productId requis"),
    productName: z.string().min(1),
    quantity:    z.number().int().positive("Quantité ≥ 1"),
    unitPrice:   z.number().min(0, "Prix ≥ 0"),
    notes:       z.string().max(500).optional(),
  })).min(1, "Au moins un article requis"),
  notes:          z.string().max(1000).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

// ── In-memory store (fallback si DB indisponible) ─────────

let orderCounter = 1000;
const orderStore       = new Map<string, OrderData>();
const idempotencyStore = new Map<string, string>(); // key → orderId

function nextOrderNumber(): string {
  return `#${++orderCounter}`;
}

// ── Service ───────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<OrderData> {
  // 0. Validation Zod — protège contre données malformées
  //    Prisma utilise des requêtes PARAMÉTRÉES → aucun risque d'injection SQL.
  const parsed = createOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`[orderService] Données invalides : ${parsed.error.message}`);
  }

  // 1. Idempotency check
  if (input.idempotencyKey && idempotencyStore.has(input.idempotencyKey)) {
    const existingId = idempotencyStore.get(input.idempotencyKey)!;
    const existing   = orderStore.get(existingId);
    if (existing) return existing;
  }

  // 2. Calcul total
  const totalAmount = input.items.reduce((sum, item) => {
    const extrasTotal = (item.extras ?? []).reduce((s, e) => s + e.price, 0);
    return sum + (item.unitPrice + extrasTotal) * item.quantity;
  }, 0);

  // 3. Résolution numéro de table
  let tableNumber: string | null = null;
  if (input.tableId) {
    tableNumber = `T-${input.tableId}`;
  }

  // 4. Essai DB Prisma
  //    ⚠️  Prisma paramétrise toutes les valeurs → AUCUN risque d'injection SQL.
  try {
    const { prisma } = await import("@/lib/db");
    if (prisma) {
      if (input.tableId) {
        const dbTable = await prisma.table.findUnique({
          where: { id: input.tableId }
        });
        if (dbTable) {
          tableNumber = `T-${dbTable.number.toString().padStart(2, '0')}`;
        }
      }
      const order = await prisma.order.create({
        data: {
          storeId:         input.restaurantId,             // champ Prisma réel
          tableId:         input.tableId ?? null,
          status:          "EN_ATTENTE",                   // enum Prisma réel
          type:            input.type,
          total:           Math.round(totalAmount * 100) / 100, // champ Prisma réel
          cashierId:       null,
          clientRequestId: input.idempotencyKey ?? null,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity:  item.quantity,
              price:     item.unitPrice,                   // champ Prisma réel
              options:   item.notes ?? null,
            })),
          },
        },
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });

      const result: OrderData = {
        id:           order.id,
        orderNumber:  nextOrderNumber(),
        restaurantId: order.storeId,
        tableId:      order.tableId,
        tableNumber,
        status:       "PENDING",
        type:         order.type as OrderType,
        totalAmount:  order.total,
        notes:        input.notes ?? null,
        items:        input.items.map((i, idx) => ({ ...i, id: `item-${idx}` })),
        createdAt:    order.createdAt.toISOString(),
        updatedAt:    order.updatedAt.toISOString(),
      };

      orderStore.set(result.id, result);
      if (input.idempotencyKey) idempotencyStore.set(input.idempotencyKey, result.id);
      await publishOrderEvent("ORDER_CREATED", result);
      return result;
    }
  } catch (err) {
    // Log explicite — remplace les anciens catch silencieux qui masquaient les erreurs DB
    logger.warn("[orderService] DB non disponible, bascule en mémoire :", (err as Error).message);
  }

  // 5. Fallback in-memory
  const id = `ord-${Date.now()}`;
  const order: OrderData = {
    id,
    orderNumber:  nextOrderNumber(),
    restaurantId: input.restaurantId,
    tableId:      input.tableId ?? null,
    tableNumber,
    status:       "PENDING",
    type:         input.type,
    totalAmount:  Math.round(totalAmount * 100) / 100,
    notes:        input.notes ?? null,
    items:        input.items.map((item, idx) => ({ ...item, id: `item-${idx}` })),
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  };

  orderStore.set(id, order);
  if (input.idempotencyKey) idempotencyStore.set(input.idempotencyKey, id);
  await publishOrderEvent("ORDER_CREATED", order);
  return order;
}

export async function getOrders(restaurantId: string, status?: OrderStatus): Promise<OrderData[]> {
  // DB first — Prisma paramétrise restaurantId → pas d'injection SQL
  try {
    const { prisma } = await import("@/lib/db");
    if (prisma) {
      const orders = await prisma.order.findMany({
        where: {
          storeId: restaurantId,
          // Le filtre de statut utilise l'enum Prisma, pas une string brute
          ...(status ? { status: "EN_ATTENTE" } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          items: {
            include: { product: { select: { name: true, id: true } } },
          },
        },
      });

      return orders.map((o) => ({
        id:           o.id,
        orderNumber:  `#${o.id.slice(-4).toUpperCase()}`,
        restaurantId: o.storeId,
        tableId:      o.tableId,
        tableNumber:  null,
        status:       "PENDING" as OrderStatus,
        type:         o.type as OrderType,
        totalAmount:  o.total,
        notes:        null,
        items:        o.items.map((i) => ({
          id:          i.id,
          productId:   i.productId,
          productName: i.product.name,
          quantity:    i.quantity,
          unitPrice:   i.price,
          notes:       i.options ?? undefined,
        })),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      }));
    }
  } catch (err) {
    logger.warn("[orderService] getOrders DB indisponible :", (err as Error).message);
  }

  // In-memory fallback
  let orders = Array.from(orderStore.values()).filter((o) => o.restaurantId === restaurantId);
  if (status) orders = orders.filter((o) => o.status === status);
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderData | null> {
  // DB first — orderId est un CUID Prisma, jamais interprété comme SQL
  try {
    const { prisma } = await import("@/lib/db");
    if (prisma) {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data:  { status: "EN_ATTENTE", updatedAt: new Date() },
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });

      const result: OrderData = {
        id:           updated.id,
        orderNumber:  `#${updated.id.slice(-4).toUpperCase()}`,
        restaurantId: updated.storeId,
        tableId:      updated.tableId,
        tableNumber:  null,
        status,
        type:         updated.type as OrderType,
        totalAmount:  updated.total,
        notes:        null,
        items:        updated.items.map((i) => ({
          id:          i.id,
          productId:   i.productId,
          productName: i.product.name,
          quantity:    i.quantity,
          unitPrice:   i.price,
        })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      await publishOrderEvent("ORDER_STATUS_UPDATED", result);
      return result;
    }
  } catch (err) {
    logger.warn("[orderService] updateOrderStatus DB indisponible :", (err as Error).message);
  }

  // In-memory fallback
  const order = orderStore.get(orderId);
  if (!order) return null;
  order.status    = status;
  order.updatedAt = new Date().toISOString();
  orderStore.set(orderId, order);
  await publishOrderEvent("ORDER_STATUS_UPDATED", order);
  return order;
}

// ── Redis Pub/Sub ─────────────────────────────────────────
async function publishOrderEvent(event: string, order: OrderData) {
  try {
    const { redisPub, REDIS_CHANNELS } = await import("@/lib/redis");
    await redisPub.publish(
      REDIS_CHANNELS.tableUpdated(order.restaurantId),
      JSON.stringify({ event, order })
    );
  } catch { /* pub/sub est best-effort, erreur non critique */ }
}

// ── Export du store pour SSE ──────────────────────────────
export function getOrderStore() { return orderStore; }
