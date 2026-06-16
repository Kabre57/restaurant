// tests/integration/delivery-flow.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { prisma } from "@/lib/db"
import { createOrder } from "@/app/actions/orders/orders"
import { DeliveryService } from "@/services/delivery.service"
import { OrderType } from "@prisma/client"

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "manager@test.com",
      role: "ADMIN",
      storeId: "test-store-delivery-flow",
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

describe("Delivery Flow Integration Tests", () => {
  let testStoreId: string
  let categoryId: string
  let productId: string
  let driverUserId: string

  beforeEach(async () => {
    // 1. Create a store
    const store = await prisma.store.create({
      data: {
        name: `Resto Delivery Flow ${Date.now()}`,
        commission: 15.0,
        ecommerceEnabled: true,
        deliveryEnabled: true,
        clickAndCollectEnabled: true,
        deliveryFee: 1400,
        preparationDelayMinutes: 30,
      },
    })
    testStoreId = store.id

    // Create a store settings entry
    await prisma.storeSettings.create({
      data: {
        storeId: testStoreId,
      },
    })

    // 2. Create a category
    const category = await prisma.category.create({
      data: {
        storeId: testStoreId,
        name: "Burgers",
      },
    })
    categoryId = category.id

    // 3. Create a product
    const product = await prisma.product.create({
      data: {
        storeId: testStoreId,
        categoryId: categoryId,
        name: "Double Cheese",
        price: 4500,
        costPrice: 2000,
        trackStock: true,
        stockQuantity: 15,
        isAvailable: true,
      },
    })
    productId = product.id

    // 4. Create driver
    const driverUser = await prisma.user.create({
      data: {
        storeId: testStoreId,
        name: "Livreur Flow",
        firstName: "Driver",
        email: `driver.flow.${Date.now()}@delivery.com`,
        password: "secure_password",
        role: "LIVREUR",
      },
    })
    driverUserId = driverUser.id

    await prisma.deliveryDriver.create({
      data: {
        userId: driverUserId,
        isActive: true,
        vehicleType: "MOTO",
      },
    })
  })

  afterEach(async () => {
    if (testStoreId) {
      await prisma.deliveryTracking.deleteMany({
        where: { livreurId: driverUserId },
      })
      await prisma.deliveryDriver.deleteMany({
        where: { userId: driverUserId },
      })
      await prisma.deliveryOrder.deleteMany({
        where: { order: { storeId: testStoreId } },
      })
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } },
      })
      await prisma.order.deleteMany({
        where: { storeId: testStoreId },
      })
      await prisma.product.deleteMany({
        where: { storeId: testStoreId },
      })
      await prisma.category.deleteMany({
        where: { storeId: testStoreId },
      })
      await prisma.user.deleteMany({
        where: { storeId: testStoreId },
      })
      await prisma.storeSettings.deleteMany({
        where: { storeId: testStoreId },
      })
      await prisma.store.delete({
        where: { id: testStoreId },
      })
    }
  })

  it("should process delivery order creation, driver assignment, GPS tracking, and delivery completion", async () => {
    // 1. Estimate delivery parameters
    const estimation = await DeliveryService.getDeliveryQuote("Riviera 3, Abidjan", testStoreId)
    expect(estimation.address).toBe("Riviera 3, Abidjan")
    expect(estimation.distanceKm).toBeGreaterThan(0)
    expect(estimation.deliveryFee).toBe(1400)

    // 2. Submit order through POS Server Action
    const orderPayload = {
      storeId: testStoreId,
      type: OrderType.DELIVERY,
      items: [
        {
          productId: productId,
          quantity: 1,
          price: 4500,
        },
      ],
      paymentMethod: "CASH",
      externalPayload: {
        deliveryAddress: estimation.address,
        deliveryClientName: "Koffi Yao",
        deliveryClientPhone: "+2250505050505",
      },
    }

    const res = await createOrder(orderPayload)
    expect(res.success).toBe(true)
    expect(res.order).toBeDefined()
    const orderId = res.order!.id

    // 3. Confirm DeliveryOrder creation in database
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { orderId },
      include: { order: true },
    })
    expect(deliveryOrder).toBeDefined()
    expect(deliveryOrder!.address).toBe(estimation.address)
    expect(deliveryOrder!.status).toBe("PENDING")

    // 4. Update status and assign to driver
    const assignedOrder = await DeliveryService.updateDeliveryStatus(
      deliveryOrder!.id,
      "ASSIGNED",
      driverUserId
    )
    expect(assignedOrder.status).toBe("ASSIGNED")
    expect(assignedOrder.livreurId).toBe(driverUserId)

    // 5. Log driver movement/GPS coordinate
    const coordinate = await DeliveryService.trackDriverLocation(
      deliveryOrder!.id,
      driverUserId,
      5.3344,
      -3.9922
    )
    expect(coordinate.latitude.toNumber()).toBe(5.3344)
    expect(coordinate.longitude.toNumber()).toBe(-3.9922)

    // Check latest tracking coordinate exists
    const latestCoords = await DeliveryService.getLatestTracking(deliveryOrder!.id)
    expect(latestCoords).toBeDefined()
    expect(latestCoords!.latitude.toNumber()).toBe(5.3344)

    // 6. Complete the delivery
    const finalOrder = await DeliveryService.updateDeliveryStatus(deliveryOrder!.id, "DELIVERED")
    expect(finalOrder.status).toBe("DELIVERED")
    expect(finalOrder.deliveredAt).toBeDefined()
  })
})
