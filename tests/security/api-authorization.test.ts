import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { cancelOrder } from "@/app/actions/orders/orderManagement";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
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

describe("API & Action Integration Security Tests", () => {
  let storeId: string;
  let otherStoreId: string;
  let serverUserId: string;
  let cashierUserId: string;
  let orderId: string;

  beforeEach(async () => {
    // 1. Create stores
    const store = await prisma.store.create({
      data: { name: `Store A ${Date.now()}`, commission: 10 },
    });
    storeId = store.id;

    const storeB = await prisma.store.create({
      data: { name: `Store B ${Date.now()}`, commission: 10 },
    });
    otherStoreId = storeB.id;

    // 2. Create users
    const serverUser = await prisma.user.create({
      data: {
        email: `server-${Date.now()}@test.com`,
        name: "Test Server",
        role: Role.SERVER,
        storeId,
        password: "dummy",
      },
    });
    serverUserId = serverUser.id;

    const cashierUser = await prisma.user.create({
      data: {
        email: `cashier-${Date.now()}@test.com`,
        name: "Test Cashier",
        role: Role.CASHIER,
        storeId,
        password: "dummy",
      },
    });
    cashierUserId = cashierUser.id;

    // 3. Create an order with active payment to allow refund
    const order = await prisma.order.create({
      data: {
        storeId,
        total: 5000,
        status: "COMPLETED",
        payments: {
          create: {
            amount: 5000,
            status: "REUSSIE",
            paymentMethod: {
              create: {
                name: "Espèces",
                type: "CASH",
                storeId,
              },
            },
          },
        },
      },
    });
    orderId = order.id;
  });

  afterEach(async () => {
    if (storeId) {
      await prisma.payment.deleteMany({ where: { order: { storeId } } });
      await prisma.paymentMethod.deleteMany({ where: { storeId } });
      await prisma.orderItem.deleteMany({ where: { order: { storeId } } });
      await prisma.order.deleteMany({ where: { storeId } });
      await prisma.user.deleteMany({ where: { storeId } });
      await prisma.store.delete({ where: { id: storeId } });
    }
    if (otherStoreId) {
      await prisma.user.deleteMany({ where: { storeId: otherStoreId } });
      await prisma.store.delete({ where: { id: otherStoreId } });
    }
  });

  it("should block SERVER role from performing order refunds (403 Forbidden)", async () => {
    // Mock session as SERVER
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: serverUserId,
        role: Role.SERVER,
        storeId: storeId,
      },
    } as any);

    const result = await cancelOrder(orderId, { refundPaidPayments: true });
    
    // Should return failure due to unauthorized access
    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission requise manquante");
  });

  it("should allow CASHIER role to perform order refunds (200 OK)", async () => {
    // Mock session as CASHIER (which has default orders_refund permission)
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: cashierUserId,
        role: Role.CASHIER,
        storeId: storeId,
      },
    } as any);

    const result = await cancelOrder(orderId, { refundPaidPayments: true });
    
    expect(result.success).toBe(true);
    expect(result.order?.status).toBe("CANCELLED");
  });

  it("should block CASHIER from refunding orders in another store (403 Forbidden)", async () => {
    // Mock session as CASHIER but inside otherStoreId
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: cashierUserId,
        role: Role.CASHIER,
        storeId: otherStoreId, // cashier is in Store B trying to refund order in Store A
      },
    } as any);

    const result = await cancelOrder(orderId, { refundPaidPayments: true });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Accès refusé");
  });
});
