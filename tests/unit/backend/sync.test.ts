// tests/unit/backend/sync.test.ts
// Test de la resynchronisation en lot (syncOrdersBatch) et résolution de doublons via idempotency key

import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncOrdersBatch, createOrder } from "@/app/actions/orders/orders";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";

type SessionResult = Awaited<ReturnType<typeof getServerSession>>;
type OrderFindUniqueResult = Awaited<ReturnType<typeof prisma.order.findUnique>>;
type OrderCreateResult = Awaited<ReturnType<typeof prisma.order.create>>;
type ProductsFindManyResult = Awaited<ReturnType<typeof prisma.product.findMany>>;
type PaymentMethodFindFirstResult = Awaited<ReturnType<typeof prisma.paymentMethod.findFirst>>;

// Mocks
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    storeSettings: {
      findUnique: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
	    product: {
	      findMany: vi.fn(),
	      findUnique: vi.fn(),
	      update: vi.fn(),
	      updateMany: vi.fn(),
	    },
    paymentMethod: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
    stockMovement: {
      create: vi.fn(),
    },
    inventory: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    productIngredient: {
      findMany: vi.fn().mockResolvedValue([]), // Pas d'ingrédients à déduire par défaut
    },
    ingredientMovement: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

vi.mock("@/app/actions/orders/orderNotifications", () => ({
  publishOrderEvent: vi.fn(),
  publishPOSOrderAlert: vi.fn(),
  publishStockAlert: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  },
  REDIS_KEYS: {
    stats: (storeId: string) => `stats:${storeId}`,
  },
}));

describe("Synchronisation des Commandes en Lot (Offline Sync / Idempotence)", () => {
  const mockSession = {
    user: {
      id: "user-cashier",
      role: "CASHIER",
      storeId: "store-1",
      email: "cashier@test.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as unknown as SessionResult);
  });

  it("doit renvoyer la commande existante si la clé d'idempotence (clientRequestId) est déjà en DB (rejeu/replay)", async () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const existingOrder = {
      id: "order-existing-1",
      storeId: "store-1",
      cashierId: "user-cashier",
      total: 3000,
      clientRequestId: validUuid,
      items: [],
      payments: [],
    };

    // La recherche de doublon trouve la commande existante
    vi.mocked(prisma.order.findUnique).mockResolvedValue(existingOrder as unknown as OrderFindUniqueResult);

    const result = await createOrder({
      clientRequestId: validUuid,
      storeId: "store-1",
      cashierId: "user-cashier",
      type: "TAKEAWAY",
      items: [{ productId: "prod-1", quantity: 2 }],
    });

    expect(result.success).toBe(true);
    expect(result).toMatchObject({ replayed: true, order: existingOrder });
    expect(prisma.order.create).not.toHaveBeenCalled(); // Ne doit pas recréer l'ordre
  });

  it("doit synchroniser un lot de commandes et isoler les succès des erreurs", async () => {
    const validUuid1 = "123e4567-e89b-12d3-a456-426614174001";
    const validUuid2 = "123e4567-e89b-12d3-a456-426614174002";
    
    // Premier ordre: valide
    // Deuxième ordre: produit indisponible
    const ordersBatch = [
      {
        clientRequestId: validUuid1,
        storeId: "store-1",
        cashierId: "user-cashier",
        type: "TAKEAWAY" as const,
        items: [{ productId: "prod-1", quantity: 1 }],
      },
      {
        clientRequestId: validUuid2,
        storeId: "store-1",
        cashierId: "user-cashier",
        type: "TAKEAWAY" as const,
        items: [{ productId: "prod-unavailable", quantity: 1 }],
      },
    ];

    // Mocks pour la création de commande
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null); // Pas de doublon
    vi.mocked(prisma.product.findMany)
      .mockResolvedValueOnce([
        {
          id: "prod-1",
          price: 1500,
          name: "Burger",
          isAvailable: true,
          trackStock: false,
        },
      ] as unknown as ProductsFindManyResult) // pour le 1er appel
      .mockResolvedValueOnce([] as unknown as ProductsFindManyResult); // pour le 2ème appel (produit non trouvé/indisponible)

    vi.mocked(prisma.paymentMethod.findFirst).mockResolvedValue(
      { id: "pm-1" } as unknown as PaymentMethodFindFirstResult
    );
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: "order-synced-1",
      total: 1500,
      clientRequestId: validUuid1,
    } as unknown as OrderCreateResult);

    const results = await syncOrdersBatch(ordersBatch);

    expect(results).toHaveLength(2);
	    // Première commande: succès isolé
	    expect(results[0].status).toBe("SYNCED");
	    expect(results[0].orderId).toBe("order-synced-1");

	    // Deuxième commande: échec isolé (produit indisponible)
	    expect(results[1].status).toBe("FAILED");
	    expect(results[1].error).toContain("produits ne sont plus disponibles");
  });
});
