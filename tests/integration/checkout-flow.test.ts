import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { OrderService } from "@/services/order.service";
import { PaymentService } from "@/services/payment.service";
import { OrderStatus, PaymentStatus, OrderSource, OrderType } from "@prisma/client";

vi.mock("@/lib/redis", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/redis")>()
  return {
    ...original,
    redis: {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      setex: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    },
    redisPub: {
      publish: vi.fn().mockResolvedValue(1),
    },
    getCached: vi.fn().mockImplementation((key, ttl, cb) => cb()),
  }
});

describe("E-commerce Checkout Integration Flow Tests", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let ingredientId: string;

  beforeEach(async () => {
    // 1. Create Store
    const store = await prisma.store.create({
      data: {
        name: `Ecomm Store Flow ${Date.now()}`,
        commission: 10.0,
        ecommerceEnabled: true,
        deliveryEnabled: true,
        clickAndCollectEnabled: true,
        deliveryFee: 1500,
        preparationDelayMinutes: 30,
      },
    });
    storeId = store.id;

    // 2. Create Category
    const category = await prisma.category.create({
      data: {
        name: `Desserts ${Date.now()}`,
        storeId,
      },
    });
    categoryId = category.id;

    // 3. Create Product
    const product = await prisma.product.create({
      data: {
        name: "Mousse au Chocolat",
        price: 2500,
        storeId,
        categoryId,
      },
    });
    productId = product.id;

    // 4. Create Ingredient
    const ingredient = await prisma.ingredient.create({
      data: {
        name: `Chocolat Noir ${Date.now()}`,
        unit: "G",
        storeId,
      },
    });
    ingredientId = ingredient.id;

    // 5. ProductIngredient Recipe
    await prisma.productIngredient.create({
      data: {
        productId,
        ingredientId,
        quantity: 50, // 50g par mousse
        unit: "G",
      },
    });

    // 6. Inventory
    await prisma.inventory.create({
      data: {
        storeId,
        ingredientId,
        quantity: 200, // Stock suffisant pour 4 mousses
        minStock: 5,
      },
    });
  });

  afterEach(async () => {
    if (storeId) {
      await prisma.payment.deleteMany({
        where: { order: { storeId } },
      });
      await prisma.deliveryOrder.deleteMany({
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
      await prisma.customer.deleteMany({
        where: { storeId },
      });
      await prisma.store.delete({
        where: { id: storeId },
      });
    }
  });

  it("should complete a full online order with delivery, succeed payment, and deplete stock", async () => {
    // 1. Passage de commande (Checkout)
    const orderData = {
      storeId,
      customerName: "Jean Marc",
      customerPhone: "+2250102030405",
      customerEmail: "jean.marc@test.com",
      deliveryType: "DELIVERY" as const,
      deliveryAddress: "Cocody, Abidjan",
      paymentMethod: "CARD" as const,
      items: [
        {
          productId,
          quantity: 2, // Requiert 100g de Chocolat Noir
          price: 2500,
        },
      ],
    };

    const checkoutResult = await OrderService.createEcommerceOrder(orderData);
    
    expect(checkoutResult.order).toBeDefined();
    expect(checkoutResult.payment).toBeDefined();
    expect(checkoutResult.order.status).toBe(OrderStatus.EN_ATTENTE);
    
    // Query payment record
    const initialPayment = await prisma.payment.findUnique({
      where: { id: checkoutResult.payment?.paymentId },
    });
    expect(initialPayment?.status).toBe(PaymentStatus.EN_ATTENTE);

    const transactionId = checkoutResult.payment?.transactionId;
    expect(transactionId).toBeDefined();

    // Vérifier que le stock n'est pas encore décrémenté
    const initialInventory = await prisma.inventory.findFirst({
      where: { storeId, ingredientId },
    });
    expect(initialInventory?.quantity).toBe(200);

    // 2. Simulation de webhook Stripe / MM confirmant le paiement
    const confirmResult = await PaymentService.confirmPayment(transactionId!);

    expect(confirmResult).toBeDefined();
    expect(confirmResult.status).toBe(PaymentStatus.REUSSIE);

    // 3. Vérification des conséquences métier
    // A. Statut de la commande
    const finalOrder = await prisma.order.findUnique({
      where: { id: checkoutResult.order.id },
      include: { deliveryOrder: true },
    });
    expect(finalOrder?.status).toBe(OrderStatus.EN_ATTENTE);
    expect(finalOrder?.type).toBe(OrderType.DELIVERY);
    
    // B. Fiche de livraison créée
    expect(finalOrder?.deliveryOrder).toBeDefined();
    expect(finalOrder?.deliveryOrder?.status).toBe("PENDING");
    expect(finalOrder?.deliveryOrder?.address).toBe("Cocody, Abidjan");

    // C. Stocks décrémentés (200g - 100g = 100g)
    const finalInventory = await prisma.inventory.findFirst({
      where: { storeId, ingredientId },
    });
    expect(finalInventory?.quantity).toBe(100);

    // D. Log de mouvement d'ingrédient créé
    const movement = await prisma.ingredientMovement.findFirst({
      where: { storeId, ingredientId },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(-100);
  });
});
