// tests/integration/delivery-integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { prisma } from "@/lib/db"
import { createOrder } from "@/app/actions/orders/orders"
import { DeliveryService } from "@/services/delivery.service"
import { OrderType } from "@prisma/client"

// Mocks for Next.js Actions & authentication guards
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "manager@test.com",
      role: "ADMIN",
      storeId: "test-store-delivery-integration",
    },
  }),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

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
})

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("Delivery Module Integration with POS Flow", () => {
  let testStoreId: string;
  let categoryId: string;
  let productId: string;
  let driverUserId: string;

  beforeEach(async () => {
    // 1. Create a store
    const store = await prisma.store.create({
      data: {
        name: `Resto Delivery Integration ${Date.now()}`,
        commission: 15.0,
        ecommerceEnabled: true,
        deliveryEnabled: true,
        clickAndCollectEnabled: true,
        deliveryFee: 1800,
        preparationDelayMinutes: 30,
      },
    });
    testStoreId = store.id;

    // Create a store settings entry
    await prisma.storeSettings.create({
      data: {
        storeId: testStoreId,
      },
    });

    // 2. Create a category
    const category = await prisma.category.create({
      data: {
        storeId: testStoreId,
        name: "Plats",
      },
    });
    categoryId = category.id;

    // 3. Create a product
    const product = await prisma.product.create({
      data: {
        storeId: testStoreId,
        categoryId: categoryId,
        name: "Poisson Grillė",
        price: 5000,
        costPrice: 2000,
        trackStock: true,
        stockQuantity: 10,
        isAvailable: true,
      },
    });
    productId = product.id;

    // 4. Create a driver user
    const driverUser = await prisma.user.create({
      data: {
        storeId: testStoreId,
        name: "Alain Koffi",
        firstName: "Alain",
        email: `alain.koffi.${Date.now()}@delivery.com`,
        password: "secure_password",
        role: "LIVREUR",
      },
    });
    driverUserId = driverUser.id;

    // Create corresponding DeliveryDriver profile
    await prisma.deliveryDriver.create({
      data: {
        userId: driverUserId,
        isActive: true,
        vehicleType: "MOTO",
      },
    });
  });

  afterEach(async () => {
    if (testStoreId) {
      // Clean up tables
      await prisma.deliveryTracking.deleteMany({
        where: { livreurId: driverUserId },
      });
      await prisma.deliveryDriver.deleteMany({
        where: { userId: driverUserId },
      });
      await prisma.deliveryOrder.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.order.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.product.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.category.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.user.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.consolidatedReport.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.storeSettings.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.store.delete({
        where: { id: testStoreId },
      });
    }
  });

  it("should calculate delivery cost, create the order, create delivery order, and track status & GPS changes", async () => {
    // 1. Test estimation
    const estimation = await DeliveryService.getDeliveryQuote(
      "Cocody, Boulevard Latrille, Abidjan",
      testStoreId
    );
    expect(estimation.address).toBe("Cocody, Boulevard Latrille, Abidjan");
    expect(estimation.distanceKm).toBeGreaterThan(0);
    expect(estimation.calculatedDeliveryFee).toBeGreaterThan(0);
    expect(estimation.deliveryFee).toBe(1800);

    // 2. Checkout via POS using createOrder action
    const orderPayload = {
      storeId: testStoreId,
      type: OrderType.DELIVERY,
      items: [
        {
          productId: productId,
          quantity: 2,
          price: 5000,
        },
      ],
      paymentMethod: "CASH",
      externalPayload: {
        deliveryAddress: estimation.address,
        deliveryClientName: "Jean Kouassi",
        deliveryClientPhone: "+2250707070707",
      },
    };

    const orderResult = await createOrder(orderPayload);
    expect(orderResult.success).toBe(true);
    expect(orderResult.order).toBeDefined();
    const orderId = orderResult.order!.id;

    // 3. Verify DeliveryOrder record was created
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { orderId },
      include: { order: true },
    });

    expect(deliveryOrder).toBeDefined();
    expect(deliveryOrder!.address).toBe(estimation.address);
    expect(deliveryOrder!.status).toBe("PENDING");
    expect(Number(deliveryOrder!.deliveryFee)).toBe(estimation.deliveryFee);

    // 4. Assign driver and set status to ASSIGNED
    const updatedStatus1 = await DeliveryService.updateDeliveryStatus(
      deliveryOrder!.id,
      "ASSIGNED",
      driverUserId
    );
    expect(updatedStatus1.status).toBe("ASSIGNED");
    expect(updatedStatus1.livreurId).toBe(driverUserId);

    // 5. Track driver GPS location
    const trackPoint = await DeliveryService.trackDriverLocation(
      deliveryOrder!.id,
      driverUserId,
      5.3125,
      -4.0098
    );
    expect(trackPoint.latitude.toNumber()).toBe(5.3125);
    expect(trackPoint.longitude.toNumber()).toBe(-4.0098);

    // 6. Verify driver location is updated on their driver profile
    const driverProfile = await prisma.deliveryDriver.findUnique({
      where: { userId: driverUserId },
    });
    expect(driverProfile!.latitude!.toNumber()).toBe(5.3125);
    expect(driverProfile!.longitude!.toNumber()).toBe(-4.0098);

    // 7. Complete delivery
    const finalOrder = await DeliveryService.updateDeliveryStatus(
      deliveryOrder!.id,
      "DELIVERED"
    );
    expect(finalOrder.status).toBe("DELIVERED");
    expect(finalOrder.deliveredAt).toBeDefined();
  });
});
