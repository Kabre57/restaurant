// __tests__/unit/tracking.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { prisma } from "@/lib/db"
import { TrackingService } from "@/services/tracking.service"
import { OrderStatus, OrderType } from "@prisma/client"

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
})

describe("TrackingService Unit Tests", () => {
  let storeId: string
  let orderId: string
  let deliveryOrderId: string
  let driverUserId: string

  beforeEach(async () => {
    // 1. Create store
    const store = await prisma.store.create({
      data: {
        name: `Resto Tracking Unit Test ${Date.now()}`,
        commission: 12.0,
      },
    })
    storeId = store.id

    // Create store settings
    await prisma.storeSettings.create({
      data: {
        storeId,
      },
    })

    // 2. Create driver
    const driver = await prisma.user.create({
      data: {
        storeId,
        name: "Livreur GPS Unit",
        firstName: "GPS",
        email: `gps.unit.${Date.now()}@test.com`,
        password: "secure_password",
        role: "LIVREUR",
      },
    })
    driverUserId = driver.id

    await prisma.deliveryDriver.create({
      data: {
        userId: driverUserId,
        isActive: true,
        vehicleType: "MOTO",
      },
    })

    // 3. Create order
    const order = await prisma.order.create({
      data: {
        storeId,
        type: OrderType.DELIVERY,
        status: OrderStatus.EN_ATTENTE,
        total: 5000,
      },
    })
    orderId = order.id

    // 4. Create delivery order
    const delivery = await prisma.deliveryOrder.create({
      data: {
        orderId,
        address: "Marcory Zone 4, Abidjan",
        deliveryFee: 1500,
        distanceKm: 4.5,
        status: "ASSIGNED",
        livreurId: driverUserId,
      },
    })
    deliveryOrderId = delivery.id
  })

  afterEach(async () => {
    if (storeId) {
      await prisma.deliveryTracking.deleteMany({
        where: { deliveryOrder: { order: { storeId } } },
      })
      await prisma.deliveryDriver.deleteMany({
        where: { userId: driverUserId },
      })
      await prisma.deliveryOrder.deleteMany({
        where: { order: { storeId } },
      })
      await prisma.orderItem.deleteMany({
        where: { order: { storeId } },
      })
      await prisma.order.deleteMany({
        where: { storeId },
      })
      await prisma.user.deleteMany({
        where: { storeId },
      })
      await prisma.storeSettings.deleteMany({
        where: { storeId },
      })
      await prisma.store.delete({
        where: { id: storeId },
      })
    }
  })

  it("should record driver positions and update active profile", async () => {
    const p1 = await TrackingService.recordPosition(deliveryOrderId, driverUserId, 5.3096, -4.0127)
    expect(p1.latitude.toNumber()).toBe(5.3096)
    expect(p1.longitude.toNumber()).toBe(-4.0127)

    // Check driver profile update
    const driverProfile = await prisma.deliveryDriver.findUnique({
      where: { userId: driverUserId },
    })
    expect(driverProfile!.latitude!.toNumber()).toBe(5.3096)
    expect(driverProfile!.longitude!.toNumber()).toBe(-4.0127)

    // Log another coordinate
    await TrackingService.recordPosition(deliveryOrderId, driverUserId, 5.3110, -4.0100)

    // History check
    const history = await TrackingService.getTrackingHistory(deliveryOrderId)
    expect(history.length).toBe(2)
    expect(history[0].latitude.toNumber()).toBe(5.3096)
    expect(history[1].latitude.toNumber()).toBe(5.3110)

    // Latest check
    const latest = await TrackingService.getLatestTracking(deliveryOrderId)
    expect(latest).toBeDefined()
    expect(latest!.latitude.toNumber()).toBe(5.3110)
  })
})
