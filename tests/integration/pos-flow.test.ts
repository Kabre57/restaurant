// tests/integration/pos-flow.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder } from "@/app/actions/orders/orders";
import { OrderStatus, OrderType, PaymentStatus, IngMvtReason } from "@prisma/client";
import crypto from "crypto";

// Mocks requis pour Next.js Actions & Rate Limits
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "manager@test.com",
      role: "ADMIN",
      storeId: "test-store-pos-flow",
    },
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Flux de vente POS - Intégration", () => {
  let testStoreId: string;
  let categoryId: string;
  let productId: string;
  let ingredientId: string;

  beforeEach(async () => {
    // 1. Créer un store temporaire unique
    const store = await prisma.store.create({
      data: {
        name: `Resto Test POS Flow ${Date.now()}`,
        commission: 15.0,
        storeSettings: {
          create: {
            rounding: "ROUND_NEAREST",
            roundingValue: 5,
            workflowType: "CASHIER_ONLY",
          },
        },
      },
    });
    testStoreId = store.id;

    // 2. Créer une catégorie
    const category = await prisma.category.create({
      data: {
        storeId: testStoreId,
        name: "Plats tests",
      },
    });
    categoryId = category.id;

    // 3. Créer un ingrédient
    const ingredient = await prisma.ingredient.create({
      data: {
        storeId: testStoreId,
        name: "Pain Burger Test",
        unit: "UNITE",
        costPrice: 100,
        sellPrice: 150,
      },
    });
    ingredientId = ingredient.id;

    // Associer l'ingrédient au stock via Inventory
    await prisma.inventory.create({
      data: {
        storeId: testStoreId,
        ingredientId: ingredientId,
        quantity: 50,
        minStock: 5.0,
      },
    });

    // Créer un produit factice avec le même ID que l'ingrédient pour satisfaire la contrainte de clé étrangère double (subRecipe_fkey)
    await prisma.product.create({
      data: {
        id: ingredientId,
        storeId: testStoreId,
        categoryId: categoryId,
        name: "Factice FK Constraint",
        price: 0,
        costPrice: 0,
        trackStock: false,
        stockQuantity: 0,
        isAvailable: false,
      },
    });

    // 4. Créer un produit qui déduit cet ingrédient
    const product = await prisma.product.create({
      data: {
        storeId: testStoreId,
        categoryId: categoryId,
        name: "Burger Test",
        price: 3500,
        costPrice: 1500,
        trackStock: true,
        stockQuantity: 10,
        isAvailable: true,
        ingredients: {
          create: {
            ingredientId: ingredientId,
            quantity: 2, // 2 pains par burger
            unit: "UNITE",
          },
        },
      },
    });
    productId = product.id;
  });

  afterEach(async () => {
    // Nettoyage manuel ordonné pour contourner les contraintes de clés étrangères
    if (testStoreId) {
      // 1. Supprimer les éléments de commande
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } }
      });
      // 2. Supprimer les paiements
      await prisma.payment.deleteMany({
        where: { order: { storeId: testStoreId } }
      });
      // 3. Supprimer les commandes
      await prisma.order.deleteMany({
        where: { storeId: testStoreId }
      });
      // 4. Supprimer les mouvements de stock et ingrédients
      await prisma.stockMovement.deleteMany({
        where: { storeId: testStoreId }
      });
      await prisma.ingredientMovement.deleteMany({
        where: { storeId: testStoreId }
      });
      // 5. Supprimer la table d'inventaire
      await prisma.inventory.deleteMany({
        where: { storeId: testStoreId }
      });
      // 6. Supprimer les ingrédients des recettes de produits
      await prisma.productIngredient.deleteMany({
        where: { product: { storeId: testStoreId } }
      });
      // 7. Supprimer les produits
      await prisma.product.deleteMany({
        where: { storeId: testStoreId }
      });
      // 8. Supprimer les ingrédients
      await prisma.ingredient.deleteMany({
        where: { storeId: testStoreId }
      });
      // 9. Supprimer les catégories
      await prisma.category.deleteMany({
        where: { storeId: testStoreId }
      });
      // 10. Supprimer les réglages du store
      await prisma.storeSettings.deleteMany({
        where: { storeId: testStoreId }
      });
      // 11. Supprimer le store lui-même
      await prisma.store.delete({
        where: { id: testStoreId },
      });
    }
  });

  it("doit créer la commande et déduire correctement les stocks de produits et d'ingrédients associés", async () => {
    // Appel du Server Action de création de commande
    const res = await createOrder({
      storeId: testStoreId,
      type: OrderType.DINE_IN,
      paymentMode: "ESPECES",
      paymentStatus: PaymentStatus.REUSSIE,
      discount: 0,
      clientRequestId: crypto.randomUUID(),
      items: [
        {
          productId: productId,
          quantity: 2, // 2 burgers commandés
        },
      ],
    });

    if (!res.success) {
      console.error("Failed to create order:", res.error);
    }

    expect(res.success).toBe(true);
    expect(res.order).toBeDefined();

    // 1. Vérifier la déduction du stock produit de 10 -> 8
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(updatedProduct?.stockQuantity).toBe(8);

    // 2. Vérifier la déduction du stock d'ingrédient de 50 -> 46 (2 pains * 2 burgers = 4 pains consommés)
    const updatedInventory = await prisma.inventory.findUnique({
      where: {
        storeId_ingredientId: {
          storeId: testStoreId,
          ingredientId: ingredientId,
        },
      },
    });
    expect(updatedInventory?.quantity).toBe(46);

    // 3. Vérifier la création d'un mouvement de stock pour le produit
    const stockMvt = await prisma.stockMovement.findFirst({
      where: {
        storeId: testStoreId,
        productId: productId,
        reason: "SALE",
      },
    });
    expect(stockMvt).toBeDefined();
    expect(stockMvt?.quantity).toBe(-2);

    // 4. Vérifier la création d'un mouvement d'ingrédient
    const ingMvt = await prisma.ingredientMovement.findFirst({
      where: {
        storeId: testStoreId,
        ingredientId: ingredientId,
      },
    });
    expect(ingMvt).toBeDefined();
    expect(ingMvt?.quantity).toBe(-4);
  });
});
