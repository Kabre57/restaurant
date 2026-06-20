import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder } from "@/app/actions/orders/orders";
import { OrderStatus, OrderType, PaymentStatus } from "@prisma/client";

// Mock next-auth/next
const mockSession = {
  user: {
    id: "cashier-1",
    name: "Test Operator",
    role: "SERVER",
    storeId: "",
  }
};

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => "127.0.0.1"),
  })),
}));

// Mock redis
vi.mock("@/lib/redis", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/redis")>()
  return {
    ...original,
    redis: {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(60),
      del: vi.fn().mockResolvedValue(1),
    },
    redisPub: {
      publish: vi.fn().mockResolvedValue(1),
    },
  }
});

describe("Order Policy & Concurrency Unit Tests", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let tableId: string;
  let cashierId: string;

  beforeEach(async () => {
    // 1. Create Store
    const store = await prisma.store.create({
      data: {
        name: `Store Policy Test ${Date.now()}`,
        commission: 10.0,
      },
    });
    storeId = store.id;
    mockSession.user.storeId = storeId;

    // 2. Create Store Settings with SERVER_FIRST workflow
    await prisma.storeSettings.upsert({
      where: { storeId },
      update: { workflowType: "SERVER_FIRST" },
      create: {
        storeId,
        workflowType: "SERVER_FIRST",
      },
    });

    // 3. Create Category
    const category = await prisma.category.create({
      data: {
        name: `Category Policy Test ${Date.now()}`,
        storeId,
      },
    });
    categoryId = category.id;

    // 4. Create Product
    const product = await prisma.product.create({
      data: {
        name: "Cafe Espresso",
        price: 1500,
        storeId,
        categoryId,
      },
    });
    productId = product.id;

    // 5. Create Table
    const table = await prisma.table.create({
      data: {
        number: 42,
        capacity: 4,
        storeId,
      },
    });
    tableId = table.id;

    // 6. Create User
    const user = await prisma.user.create({
      data: {
        storeId,
        name: "Test Operator",
        email: `operator-${Date.now()}@test.com`,
        password: "hashedpassword",
        role: "SERVER",
      }
    });
    cashierId = user.id;
    mockSession.user.id = user.id;
  });

  afterEach(async () => {
    if (storeId) {
      await prisma.payment.deleteMany({ where: { order: { storeId } } });
      await prisma.orderItem.deleteMany({ where: { order: { storeId } } });
      await prisma.order.deleteMany({ where: { storeId } });
      await prisma.table.deleteMany({ where: { storeId } });
      await prisma.product.deleteMany({ where: { storeId } });
      await prisma.category.deleteMany({ where: { storeId } });
      await prisma.user.deleteMany({ where: { storeId } });
      await prisma.storeSettings.deleteMany({ where: { storeId } });
      await prisma.consolidatedReport.deleteMany({ where: { storeId } });
      await prisma.store.delete({ where: { id: storeId } });
    }
  });

  it("should reject DINE_IN orders if tableId is missing in SERVER_FIRST mode", async () => {
    const orderInput = {
      storeId,
      cashierId,
      type: "DINE_IN" as const,
      paymentMode: "ESPECES",
      paymentStatus: "EN_ATTENTE",
      items: [
        {
          productId,
          quantity: 2,
          name: "Cafe Espresso",
        },
      ],
    };

    const res = await createOrder(orderInput);
    expect(res.success).toBe(false);
    expect(res.error).toBe("Une table est obligatoire pour le service en salle.");
  });

  it("should successfully create DINE_IN order if tableId is provided", async () => {
    const orderInput = {
      storeId,
      cashierId,
      type: "DINE_IN" as const,
      tableId,
      paymentMode: "ESPECES",
      paymentStatus: "EN_ATTENTE",
      items: [
        {
          productId,
          quantity: 2,
          name: "Cafe Espresso",
        },
      ],
    };

    const res = await createOrder(orderInput);
    expect(res.success).toBe(true);
    expect(res.order).toBeDefined();
    expect(res.order?.tableId).toBe(tableId);
    expect(res.order?.items.length).toBe(1);
    expect(res.order?.items[0].productId).toBe(productId);
  });

  it("should merge items into an existing active order if one already exists for the table", async () => {
    const firstOrderInput = {
      storeId,
      cashierId,
      type: "DINE_IN" as const,
      tableId,
      paymentMode: "ESPECES",
      paymentStatus: "EN_ATTENTE",
      items: [
        {
          productId,
          quantity: 1,
          name: "Cafe Espresso",
        },
      ],
    };

    const firstRes = await createOrder(firstOrderInput);
    expect(firstRes.success).toBe(true);
    const firstOrderId = firstRes.order?.id;

    // Second order request for the same table
    const secondOrderInput = {
      storeId,
      cashierId,
      type: "DINE_IN" as const,
      tableId,
      paymentMode: "ESPECES",
      paymentStatus: "EN_ATTENTE",
      items: [
        {
          productId,
          quantity: 2,
          name: "Cafe Espresso",
        },
      ],
    };

    const secondRes = await createOrder(secondOrderInput);
    expect(secondRes.success).toBe(true);
    
    // Check that it returned the same order ID (merged)
    expect(secondRes.order?.id).toBe(firstOrderId);

    // Verify items in DB
    const finalOrder = await prisma.order.findUnique({
      where: { id: firstOrderId },
      include: { items: true },
    });

    expect(finalOrder?.items.length).toBe(2);
    const totalQuantity = finalOrder?.items.reduce((sum, item) => sum + item.quantity, 0);
    expect(totalQuantity).toBe(3);
  });

  it("should handle simultaneous orders concurrently without creating duplicate active orders", async () => {
    const orderInput1 = {
      storeId,
      cashierId,
      type: "DINE_IN" as const,
      tableId,
      paymentMode: "ESPECES",
      paymentStatus: "EN_ATTENTE",
      items: [
        {
          productId,
          quantity: 1,
          name: "Cafe Espresso",
        },
      ],
    };

    const orderInput2 = {
      storeId,
      cashierId,
      type: "DINE_IN" as const,
      tableId,
      paymentMode: "ESPECES",
      paymentStatus: "EN_ATTENTE",
      items: [
        {
          productId,
          quantity: 2,
          name: "Cafe Espresso",
        },
      ],
    };

    // Run both concurrently
    const [res1, res2] = await Promise.all([
      createOrder(orderInput1),
      createOrder(orderInput2),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    // Verify in DB that only 1 active order exists for this table
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId,
        storeId,
        status: {
          in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET]
        }
      }
    });

    expect(activeOrders.length).toBe(1);
    
    // The items from both should be merged under that single active order
    const finalOrder = await prisma.order.findUnique({
      where: { id: activeOrders[0].id },
      include: { items: true }
    });

    const totalQuantity = finalOrder?.items.reduce((sum, item) => sum + item.quantity, 0);
    expect(totalQuantity).toBe(3);
  });

  it("should calculate and update loyalty points incrementally (delta) during fusions", async () => {
    // 1. Create a LoyaltyCustomer
    await prisma.loyaltyCustomer.deleteMany({ where: { phone: "+22509090909" } });
    const customer = await prisma.loyaltyCustomer.create({
      data: {
        nom: "Client Fidele",
        phone: "+22509090909",
        points: 100,
      }
    });

    // 2. Place first order (paid immediately so points are credited)
    const firstOrderInput = {
      storeId,
      cashierId,
      customerId: customer.id,
      type: "DINE_IN" as const,
      tableId,
      paymentMode: "ESPECES",
      paymentStatus: "REUSSIE",
      items: [
        {
          productId,
          quantity: 1,
          name: "Cafe Espresso",
        },
      ],
    };

    const firstRes = await createOrder(firstOrderInput);
    expect(firstRes.success).toBe(true);

    // Verify first points addition
    let updatedCustomer = await prisma.loyaltyCustomer.findUnique({
      where: { id: customer.id }
    });
    // total: 1500 net. Points: Math.floor(1500 / 100) = 15. Total: 115.
    expect(updatedCustomer?.points).toBe(115);

    // 3. Second order request (merged, paid immediately as well)
    const secondOrderInput = {
      storeId,
      cashierId,
      customerId: customer.id,
      type: "DINE_IN" as const,
      tableId,
      paymentMode: "ESPECES",
      paymentStatus: "REUSSIE",
      items: [
        {
          productId,
          quantity: 2,
          name: "Cafe Espresso",
        },
      ],
    };

    const secondRes = await createOrder(secondOrderInput);
    expect(secondRes.success).toBe(true);

    // Verify incremental points addition (only delta points of second items are credited: +35 points. Total: 152)
    updatedCustomer = await prisma.loyaltyCustomer.findUnique({
      where: { id: customer.id }
    });
    expect(updatedCustomer?.points).toBe(145);

    // Clean up
    await prisma.loyaltyTransaction.deleteMany({ where: { customerId: customer.id } });
    await prisma.loyaltyCustomer.delete({ where: { id: customer.id } });
  });
});
