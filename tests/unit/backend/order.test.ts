// tests/unit/backend/order.test.ts
// Test de la création de commande, calcul des montants, gestion d'idempotence et fallback en mémoire

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder, getOrders, updateOrderStatus, getOrderStore } from "@/lib/orderService";
import { prisma } from "@/lib/db";
import { redisPub } from "@/lib/redis";

// Mocks
vi.mock("@/lib/db", () => ({
  prisma: {
    table: {
      findUnique: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/redis", () => ({
  redisPub: {
    publish: vi.fn().mockResolvedValue(1),
  },
  REDIS_CHANNELS: {
    tableUpdated: (storeId: string) => `store:${storeId}:tables`,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Gestion des Commandes (orderService) - Unitaire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Vider le store en mémoire pour garder les tests isolés
    getOrderStore().clear();
  });

  it("doit calculer correctement le total de la commande avec extras", async () => {
    vi.mocked(prisma.table.findUnique).mockResolvedValue({ id: "t-1", number: 5 } as any);
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: "ord-123",
      storeId: "store-1",
      tableId: "t-1",
      type: "DINE_IN",
      total: 3500.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await createOrder({
      restaurantId: "store-1",
      tableId: "t-1",
      type: "DINE_IN",
      items: [
        {
          productId: "prod-1",
          productName: "Burger",
          quantity: 2,
          unitPrice: 1500, // 3000 total
          extras: [{ name: "Fromage", price: 250 }], // 250 * 2 = 500
        },
      ],
    });

    expect(result.totalAmount).toBe(3500); // (1500 + 250) * 2 = 3500
    expect(prisma.order.create).toHaveBeenCalled();
    expect(redisPub.publish).toHaveBeenCalled();
  });

  it("doit gérer l'idempotence avec idempotencyKey", async () => {
    const key = "e9ec750d-93db-4015-9d01-f0fab7d4986d";
    const orderData = {
      restaurantId: "store-1",
      type: "TAKEAWAY" as const,
      idempotencyKey: key,
      items: [
        {
          productId: "prod-1",
          productName: "Burger",
          quantity: 1,
          unitPrice: 1500,
        },
      ],
    };

    vi.mocked(prisma.order.create).mockResolvedValue({
      id: "ord-first",
      storeId: "store-1",
      tableId: null,
      type: "TAKEAWAY",
      total: 1500.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Premier appel
    const res1 = await createOrder(orderData);

    // Deuxième appel avec la même clé
    const res2 = await createOrder(orderData);

    expect(res1.id).toBe(res2.id);
    expect(prisma.order.create).toHaveBeenCalledTimes(1); // Le second doit renvoyer le cache mémoire
  });

  it("doit basculer en mode mémoire si la base de données est indisponible", async () => {
    vi.mocked(prisma.order.create).mockRejectedValue(new Error("Connexion DB perdue"));

    const result = await createOrder({
      restaurantId: "store-1",
      type: "DELIVERY",
      items: [
        {
          productId: "prod-1",
          productName: "Burger",
          quantity: 1,
          unitPrice: 1500,
        },
      ],
    });

    // Doit quand même réussir en créant un ID ord-... en mémoire
    expect(result.id).toContain("ord-");
    expect(result.totalAmount).toBe(1500);
  });

  it("doit mettre à jour le statut de la commande", async () => {
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: "ord-1",
      storeId: "store-1",
      tableId: null,
      type: "DINE_IN",
      total: 1500,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    } as any);

    const result = await updateOrderStatus("ord-1", "PREPARING");
    expect(result).not.toBeNull();
    expect(result?.status).toBe("PREPARING");

  });
});
