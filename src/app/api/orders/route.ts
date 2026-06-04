// src/app/api/orders/route.ts — POST (créer) + GET (lister)
// BUG-002 FIX : toutes les routes protégées par getServerSession

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createOrder, getOrders, CreateOrderInput, OrderStatus } from "@/lib/orderService";
import { orderCreateSchema, formatZodError } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

// ─── Helper : récupère et vérifie la session ───────────────
async function requireSession(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Authentification requise" },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
      ),
    };
  }
  return { session, error: null };
}

// ─── Helper : vérifie l'isolation multi-tenant ────────────
function requireStoreAccess(
  sessionStoreId: string,
  requestedStoreId: string,
  userRole: string
): NextResponse | null {
  // ADMIN peut accéder à tous les stores
  if (userRole === "ADMIN") return null;
  if (sessionStoreId !== requestedStoreId) {
    return NextResponse.json(
      { error: "Accès refusé : ce store ne vous appartient pas" },
      { status: 403 }
    );
  }
  return null;
}

// ── GET /api/orders?restaurantId=xxx&status=PENDING ───────
export async function GET(req: NextRequest) {
  // 1. Auth
  const { session, error } = await requireSession(req);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const restaurantId = searchParams.get("restaurantId") ?? (session!.user as any).storeId;
  const status       = searchParams.get("status") as OrderStatus | null;

  // 2. Isolation tenant
  const storeId = (session!.user as any).storeId as string;
  const role    = (session!.user as any).role as string;
  const accessError = requireStoreAccess(storeId, restaurantId, role);
  if (accessError) return accessError;

  const orders = await getOrders(restaurantId, status ?? undefined);
  return NextResponse.json({ orders, count: orders.length }, { status: 200 });
}

// ── POST /api/orders ──────────────────────────────────────
export async function POST(req: NextRequest) {
  // FIXED: Ajouter checkRateLimit avec IP (10 req/minute)
  const ipKey = rateLimitKey("api-orders-post", req);
  const rateLimitResult = await checkRateLimit(ipKey, 10, 60);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult);
  }

  // 1. Auth
  const { session, error } = await requireSession(req);
  if (error) return error;

  // 2. Parse + validation Zod
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 3. Isolation tenant
  const sessionStoreId = (session!.user as any).storeId as string;
  const role           = (session!.user as any).role as string;
  const accessError = requireStoreAccess(sessionStoreId, data.storeId, role);
  if (accessError) return accessError;

  // 4. Idempotency key depuis header (standard RFC)
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;

  const input: CreateOrderInput = {
    restaurantId:   data.storeId,
    tableId:        data.tableId,
    type:           data.type as "DINE_IN" | "TAKEAWAY" | "DELIVERY",
    items:          data.items.map((item) => ({
      productId:   item.productId,
      productName: item.productId, // résolu dans le service
      quantity:    item.quantity,
      unitPrice:   0,              // résolu depuis la BDD dans le service
      notes:       item.options,
    })),
    idempotencyKey,
  };

  try {
    const order = await createOrder(input);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("[Orders] Create error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 }
    );
  }
}

