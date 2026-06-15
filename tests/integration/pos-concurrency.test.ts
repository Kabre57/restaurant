import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder } from "@/app/actions/orders/orders";
import { getServerSession } from "next-auth/next";
import { OrderStatus, Role } from "@prisma/client";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
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

describe("POS Concurrency & Table Lock Integration Tests", () => {
  let testStoreId: string;
  let testUserId: string;
  let tableId: string;
  let productId: string;

  beforeEach(async () => {
    // 1. Create store
    const store = await prisma.store.create({
      data: {
        name: `Concurrency Store ${Date.now()}`,
        commission: 10.0,
      },
    });
    testStoreId = store.id;

    // 2. Create user
    const user = await prisma.user.create({
      data: {
        email: `cashier-${Date.now()}@concurrency.com`,
        name: "Test Cashier",
        role: Role.RESTAURATEUR,
        storeId: testStoreId,
        password: "hashedpassword",
      },
    });
    testUserId = user.id;

    // 3. Create table
    const table = await prisma.table.create({
      data: {
        storeId: testStoreId,
        number: 42,
        capacity: 4,
      },
    });
    tableId = table.id;

    // 4. Create category and product
    const category = await prisma.category.create({
      data: {
        storeId: testStoreId,
        name: "Drinks",
      },
    });
    const product = await prisma.product.create({
      data: {
        storeId: testStoreId,
        categoryId: category.id,
        name: "Beer",
        price: 1500,
        costPrice: 800,
        trackStock: true,
        stockQuantity: 100,
        isAvailable: true,
      },
    });
    productId = product.id;

    // Mock session
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: testUserId,
        email: user.email,
        role: user.role,
        storeId: testStoreId,
      },
    } as any);
  });

  afterEach(async () => {
    if (testStoreId) {
      await prisma.orderItem.deleteMany({ where: { order: { storeId: testStoreId } } });
      await prisma.payment.deleteMany({ where: { order: { storeId: testStoreId } } });
      await prisma.order.deleteMany({ where: { storeId: testStoreId } });
      await prisma.table.deleteMany({ where: { storeId: testStoreId } });
      await prisma.product.deleteMany({ where: { storeId: testStoreId } });
      await prisma.category.deleteMany({ where: { storeId: testStoreId } });
      await prisma.user.deleteMany({ where: { storeId: testStoreId } });
      await prisma.consolidatedReport.deleteMany({ where: { storeId: testStoreId } });
      await prisma.store.delete({ where: { id: testStoreId } });
    }
  });

  it("should successfully serialize concurrent order creations on the same table and merge them into exactly one order", async () => {
    // Prepare two concurrent order inputs on the same table
    const orderInput1 = {
      storeId: testStoreId,
      type: "DINE_IN" as any,
      tableId: tableId,
      items: [{ productId: productId, quantity: 2 }],
    };

    const orderInput2 = {
      storeId: testStoreId,
      type: "DINE_IN" as any,
      tableId: tableId,
      items: [{ productId: productId, quantity: 3 }],
    };

    // Trigger concurrently
    const results = await Promise.all([
      createOrder(orderInput1),
      createOrder(orderInput2),
    ]);

    // Both should report success
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    // Verify exactly one active order exists for this table in the DB
    const orders = await prisma.order.findMany({
      where: {
        storeId: testStoreId,
        tableId: tableId,
        status: {
          in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET],
        },
      },
      include: {
        items: true,
      },
    });

    expect(orders.length).toBe(1);

    // Verify quantities are merged (2 + 3 = 5 items total)
    const activeOrder = orders[0];
    const totalQuantity = activeOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    expect(totalQuantity).toBe(5);
  });
});
