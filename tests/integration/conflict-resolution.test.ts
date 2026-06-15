// tests/integration/conflict-resolution.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/v1/orders/route";
import { DeliveryPlatform, OrderType } from "@prisma/client";
import crypto from "crypto";

// Variables globales dynamiques pour les mocks
let currentStoreId = "";

vi.mock("@/lib/api-auth", () => ({
  validateApiToken: vi.fn().mockImplementation(() =>
    Promise.resolve({
      storeId: currentStoreId,
      tokenId: "test-token-id",
    })
  ),
  readApiTokenFromRequest: vi.fn().mockReturnValue("mock-api-token"),
}));

vi.mock("@/lib/redis", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/redis")>();
  return {
    ...original,
    redis: {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      setex: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    },
    getCached: vi.fn().mockImplementation((key, ttl, cb) => cb()),
  };
});

describe("Résolution des Conflits de Sync Offline & Idempotence", () => {
  let testStoreId: string;
  let categoryId: string;
  let productId: string;

  beforeEach(async () => {
    // 1. Créer un store temporaire
    const store = await prisma.store.create({
      data: {
        name: `Resto Sync Conflict Test ${Date.now()}`,
        commission: 12.0,
      },
    });
    testStoreId = store.id;
    currentStoreId = store.id;

    // 2. Créer une catégorie
    const category = await prisma.category.create({
      data: {
        storeId: testStoreId,
        name: "Sync Category",
      },
    });
    categoryId = category.id;

    // 3. Créer un produit avec stock initial = 10
    const product = await prisma.product.create({
      data: {
        storeId: testStoreId,
        categoryId: categoryId,
        name: "Burger Stock Limite",
        price: 4000,
        costPrice: 2000,
        trackStock: true,
        stockQuantity: 10,
        isAvailable: true,
      },
    });
    productId = product.id;
  });

  afterEach(async () => {
    // Nettoyage complet
    if (testStoreId) {
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.payment.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.order.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.stockMovement.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.product.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.category.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.store.delete({
        where: { id: testStoreId },
      });
    }
  });

  it("doit appliquer cumulativement les commandes offline, rejeter le sur-stockage et être totalement idempotente", async () => {
    const clientReqId1 = crypto.randomUUID();
    const clientReqId2 = crypto.randomUUID();
    const clientReqId3 = crypto.randomUUID();

    // --- 1. Première commande offline (Quantité = 3) ---
    const req1 = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRequestId: clientReqId1,
        sourcePlatform: DeliveryPlatform.GENERIC,
        type: OrderType.DINE_IN,
        items: [{ productId: productId, quantity: 3 }],
      }),
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    expect(body1.success).toBe(true);
    expect(body1.order).toBeDefined();

    // Vérifier que le stock est passé de 10 -> 7
    let currentProd = await prisma.product.findUnique({ where: { id: productId } });
    expect(currentProd?.stockQuantity).toBe(7);

    // --- 2. Deuxième commande offline (Quantité = 4) ---
    const req2 = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRequestId: clientReqId2,
        sourcePlatform: DeliveryPlatform.GENERIC,
        type: OrderType.DINE_IN,
        items: [{ productId: productId, quantity: 4 }],
      }),
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(201);
    const body2 = await res2.json();
    expect(body2.success).toBe(true);

    // Vérifier que le stock est passé de 7 -> 3
    currentProd = await prisma.product.findUnique({ where: { id: productId } });
    expect(currentProd?.stockQuantity).toBe(3);

    // --- 3. Test d'idempotence : Ré-envoi de la commande 1 (clientReqId1) ---
    const req1Retry = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRequestId: clientReqId1,
        sourcePlatform: DeliveryPlatform.GENERIC,
        type: OrderType.DINE_IN,
        items: [{ productId: productId, quantity: 3 }],
      }),
    });

    const res1Retry = await POST(req1Retry);
    expect(res1Retry.status).toBe(200); // 200 pour un replay réussi
    const body1Retry = await res1Retry.json();
    expect(body1Retry.success).toBe(true);
    expect(body1Retry.replayed).toBe(true);
    expect(body1Retry.order.id).toBe(body1.order.id);

    // Vérifier que le stock n'a pas bougé (reste à 3)
    currentProd = await prisma.product.findUnique({ where: { id: productId } });
    expect(currentProd?.stockQuantity).toBe(3);

    // --- 4. Rejet en cas de stock insuffisant (Quantité = 5 alors que le stock restant est de 3) ---
    const req3 = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRequestId: clientReqId3,
        sourcePlatform: DeliveryPlatform.GENERIC,
        type: OrderType.DINE_IN,
        items: [{ productId: productId, quantity: 5 }],
      }),
    });

    const res3 = await POST(req3);
    expect(res3.status).toBe(409); // Conflit / Stock insuffisant
    const body3 = await res3.json();
    expect(body3.error).toContain("Stock insuffisant");

    // Vérifier que le stock reste bien à 3
    currentProd = await prisma.product.findUnique({ where: { id: productId } });
    expect(currentProd?.stockQuantity).toBe(3);
  });
});
