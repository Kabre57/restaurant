import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { OrderService } from "@/services/order.service";
import { OrderStatus, OrderType, OrderSource } from "@prisma/client";

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

describe("OrderService Unit Tests", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let ingredientId: string;

  beforeEach(async () => {
    // 1. Create Store
    const store = await prisma.store.create({
      data: {
        name: `Store Unit Test Order ${Date.now()}`,
        commission: 15.0,
        ecommerceEnabled: true,
        deliveryEnabled: true,
        clickAndCollectEnabled: true,
        deliveryFee: 1250,
        preparationDelayMinutes: 30,
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
        name: "Pizza Margherita Test",
        price: 5000,
        storeId,
        categoryId,
      },
    });
    productId = product.id;

    // 4. Create Ingredient
    const ingredient = await prisma.ingredient.create({
      data: {
        name: `Fromage Mozzarella Test ${Date.now()}`,
        unit: "G",
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

    // 5. Create Product Recipe relation
    await prisma.productIngredient.create({
      data: {
        productId,
        ingredientId,
        quantity: 100, // 100g de fromage par pizza
        unit: "G",
      },
    });

    // 6. Create Inventory for ingredient in store
    await prisma.inventory.create({
      data: {
        storeId,
        ingredientId,
        quantity: 500, // Stock suffisant pour 5 pizzas (5 * 100g)
        minStock: 10,
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

  it("should create an e-commerce order when stock is sufficient", async () => {
    const orderData = {
      storeId,
      customerName: "Alice Dupont",
      customerPhone: "+22501020304",
      customerEmail: "alice@test.com",
      deliveryType: "CLICK_AND_COLLECT" as const,
      paymentMethod: "CARD" as const,
      items: [
        {
          productId,
          quantity: 2, // requiert 200g (stock 500g -> ok)
          price: 5000,
        },
      ],
    };

    const result = await OrderService.createEcommerceOrder(orderData);
    
    expect(result.order).toBeDefined();
    expect(result.order.customerName).toBe("Alice Dupont");
    expect(result.order.total).toBe(11800);
    expect(result.order.status).toBe(OrderStatus.EN_ATTENTE);
    expect(result.order.source).toBe(OrderSource.ONLINE);
    expect(result.order.type).toBe(OrderType.TAKEAWAY);
    expect(result.payment).toBeDefined();
  });

  it("should ignore a falsified client price and use the database product price", async () => {
    const orderData = {
      storeId,
      customerName: "Client Prix",
      customerPhone: "+22501020304",
      deliveryType: "CLICK_AND_COLLECT" as const,
      paymentMethod: "CARD" as const,
      items: [
        {
          productId,
          quantity: 2,
          price: 1,
        },
      ],
    };

    const result = await OrderService.createEcommerceOrder(orderData);

    expect(result.order.total).toBe(11800);
    expect(result.order.items[0].price).toBe(5000);
  });

  it("should reject delivery when delivery is disabled for the store", async () => {
    await prisma.store.update({
      where: { id: storeId },
      data: { deliveryEnabled: false },
    });

    const orderData = {
      storeId,
      customerName: "Client Livraison",
      customerPhone: "+22501020304",
      deliveryType: "DELIVERY" as const,
      deliveryAddress: "Cocody, Abidjan",
      paymentMethod: "CARD" as const,
      items: [
        {
          productId,
          quantity: 1,
          price: 5000,
        },
      ],
    };

    await expect(OrderService.createEcommerceOrder(orderData)).rejects.toThrow(
      "La livraison à domicile n'est pas disponible"
    );
  });

  it("should apply the configured fixed delivery fee on delivery orders", async () => {
    const orderData = {
      storeId,
      customerName: "Client Livraison",
      customerPhone: "+22501020304",
      deliveryType: "DELIVERY" as const,
      deliveryAddress: "Cocody, Abidjan",
      paymentMethod: "CARD" as const,
      items: [
        {
          productId,
          quantity: 1,
          price: 1,
        },
      ],
    };

    const result = await OrderService.createEcommerceOrder(orderData);
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { orderId: result.order.id },
    });

    expect(result.order.total).toBe(7150);
    expect(Number(deliveryOrder?.deliveryFee)).toBe(1250);
  });

  it("should reject products from another store", async () => {
    const otherStore = await prisma.store.create({
      data: {
        name: `Other Store Unit Test ${Date.now()}`,
        ecommerceEnabled: true,
        clickAndCollectEnabled: true,
      },
    });
    const otherCategory = await prisma.category.create({
      data: {
        name: `Other Category ${Date.now()}`,
        storeId: otherStore.id,
      },
    });
    const otherProduct = await prisma.product.create({
      data: {
        name: "Produit Autre Store",
        price: 100,
        storeId: otherStore.id,
        categoryId: otherCategory.id,
      },
    });

    const orderData = {
      storeId,
      customerName: "Client Store",
      customerPhone: "+22501020304",
      deliveryType: "CLICK_AND_COLLECT" as const,
      paymentMethod: "CARD" as const,
      items: [
        {
          productId: otherProduct.id,
          quantity: 1,
          price: 100,
        },
      ],
    };

    await expect(OrderService.createEcommerceOrder(orderData)).rejects.toThrow(
      "Un ou plusieurs produits sont indisponibles"
    );

    await prisma.product.delete({ where: { id: otherProduct.id } });
    await prisma.category.delete({ where: { id: otherCategory.id } });
    await prisma.store.delete({ where: { id: otherStore.id } });
  });

  it("should reject requested fulfillment times before the preparation delay", async () => {
    const tooSoon = new Date(Date.now() + 5 * 60_000);
    const orderData = {
      storeId,
      customerName: "Client Trop Pressé",
      customerPhone: "+22501020304",
      deliveryType: "CLICK_AND_COLLECT" as const,
      requestedFulfillmentAt: tooSoon,
      paymentMethod: "CARD" as const,
      items: [
        {
          productId,
          quantity: 1,
          price: 5000,
        },
      ],
    };

    await expect(OrderService.createEcommerceOrder(orderData)).rejects.toThrow(
      "Le délai minimal de préparation est de 30 minutes"
    );
  });

  it("should fail to create order if stock is insufficient", async () => {
    const orderData = {
      storeId,
      customerName: "Bob Smith",
      customerPhone: "+22505060708",
      deliveryType: "CLICK_AND_COLLECT" as const,
      paymentMethod: "CARD" as const,
      items: [
        {
          productId,
          quantity: 6, // requiert 600g (stock 500g -> insuffisant)
          price: 5000,
        },
      ],
    };

    await expect(OrderService.createEcommerceOrder(orderData)).rejects.toThrow();
  });
});
