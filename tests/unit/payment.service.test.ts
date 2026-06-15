import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { PaymentService } from "@/services/payment.service";
import { OrderStatus, PaymentStatus, OrderSource } from "@prisma/client";

vi.mock("@/lib/redis", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/redis")>()
  return {
    ...original,
    redis: {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
    },
    redisPub: {
      publish: vi.fn().mockResolvedValue(1),
    },
  }
});

describe("PaymentService Unit Tests", () => {
  let storeId: string;
  let categoryId: string;
  let orderId: string;
  let productId: string;
  let ingredientId: string;
  let paymentId: string;
  const transactionId = `txn-${Date.now()}`;

  beforeEach(async () => {
    // 1. Create Store
    const store = await prisma.store.create({
      data: {
        name: `Store Unit Test Payment ${Date.now()}`,
        commission: 15.0,
      },
    });
    storeId = store.id;

    // 2. Create Category
    const category = await prisma.category.create({
      data: {
        name: `Category Test ${Date.now()}`,
        storeId,
      },
    });
    categoryId = category.id;

    // 3. Create Product
    const product = await prisma.product.create({
      data: {
        name: "Mock Burger",
        price: 3500,
        storeId,
        categoryId,
      },
    });
    productId = product.id;

    // 4. Create Ingredient
    const ingredient = await prisma.ingredient.create({
      data: {
        name: `Mock Steak ${Date.now()}`,
        unit: "PCS",
        storeId,
      },
    });
    ingredientId = ingredient.id;

    // Create a dummy product with the same ID as the ingredient to satisfy the polymorphic relation constraints in Postgres
    await prisma.product.create({
      data: {
        id: ingredientId,
        name: "Dummy Product for FK constraint",
        price: 0,
        storeId,
        categoryId,
      }
    });

    // 5. ProductIngredient Recipe
    await prisma.productIngredient.create({
      data: {
        productId,
        ingredientId,
        quantity: 1,
        unit: "PCS",
      },
    });

    // 6. Inventory
    await prisma.inventory.create({
      data: {
        storeId,
        ingredientId,
        quantity: 10, // Stock initial de 10
        minStock: 1,
      },
    });

    // 7. Order (En attente)
    const order = await prisma.order.create({
      data: {
        storeId,
        customerName: "Bob Test",
        customerPhone: "+22500000001",
        status: OrderStatus.EN_ATTENTE,
        source: OrderSource.ONLINE,
        total: 3500,
        items: {
          create: {
            productId,
            quantity: 2, // Requiert 2 steaks
            price: 3500,
          },
        },
      },
    });
    orderId = order.id;

    // 8. Payment (En attente)
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: 3500,
        status: PaymentStatus.EN_ATTENTE,
        onlineMethod: "CARD",
        transactionId,
      },
    });
    paymentId = payment.id;
  });

  afterEach(async () => {
    if (storeId) {
      await prisma.payment.deleteMany({
        where: { order: { storeId } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { storeId } },
      });
      await prisma.order.deleteMany({
        where: { storeId },
      });
      await prisma.inventory.deleteMany({
        where: { storeId },
      });
      await prisma.productIngredient.deleteMany({
        where: { productId },
      });
      await prisma.product.deleteMany({
        where: { storeId },
      });
      await prisma.category.deleteMany({
        where: { storeId },
      });
      await prisma.ingredient.deleteMany({
        where: { storeId },
      });
      await prisma.store.delete({
        where: { id: storeId },
      });
    }
  });

  it("should confirm payment, update status, and deplete stock correctly", async () => {
    // Confirme le paiement
    const payment = await PaymentService.confirmPayment(transactionId);
    
    expect(payment).toBeDefined();
    expect(payment.status).toBe(PaymentStatus.REUSSIE);

    // Vérifie le statut de la commande
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.EN_ATTENTE);

    // Vérifie le stock d'ingrédient décrémenté (10 - 2 = 8)
    const updatedInventory = await prisma.inventory.findFirst({
      where: { storeId, ingredientId },
    });
    expect(updatedInventory?.quantity).toBe(8);
  });

  it("should fail payment correctly", async () => {
    const payment = await PaymentService.failPayment(transactionId);
    
    expect(payment).toBeDefined();
    expect(payment.status).toBe(PaymentStatus.ECHOUEE);

    // La commande doit rester en attente ou échouer
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.EN_ATTENTE);
  });
});
