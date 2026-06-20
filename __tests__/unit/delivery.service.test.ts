// __tests__/unit/delivery.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { prisma } from "@/lib/db"
import { DeliveryService } from "@/services/delivery.service"
import { OrderStatus, OrderType, DeliveryOrderStatus } from "@prisma/client"

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

describe("DeliveryService Unit Tests", () => {
  let storeId: string
  let orderId: string
  let driverUserId: string

  beforeEach(async () => {
    // 1. Create store
    const store = await prisma.store.create({
      data: {
        name: `Resto Unit Test ${Date.now()}`,
        commission: 12.0,
      },
    })
    storeId = store.id

    // 2. Create store settings
    await prisma.storeSettings.create({
      data: {
        storeId,
      },
    })

    // 3. Create driver
    const driver = await prisma.user.create({
      data: {
        storeId,
        name: "Livreur Unit",
        firstName: "Driver",
        email: `driver.unit.${Date.now()}@test.com`,
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

    // 4. Create order
    const order = await prisma.order.create({
      data: {
        storeId,
        type: OrderType.DELIVERY,
        status: OrderStatus.EN_ATTENTE,
        total: 8500,
        customerName: "Client Test Unit",
        customerPhone: "+22500000000",
      },
    })
    orderId = order.id
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

  it("should estimate delivery distance and fee correctly", async () => {
    const est = await DeliveryService.estimateDelivery("Marcory, Abidjan", storeId)
    expect(est.address).toBe("Marcory, Abidjan")
    expect(est.distanceKm).toBeGreaterThan(0)
    expect(est.deliveryFee).toBeGreaterThan(500)
    expect(est.estimatedTimeMinutes).toBeGreaterThan(0)
  })

  it("should create delivery order correctly", async () => {
    const delivery = await DeliveryService.createDeliveryOrder({
      orderId,
      address: "Zone 4, Abidjan",
      estimatedTimeMinutes: 25,
    })

    expect(delivery.orderId).toBe(orderId)
    expect(delivery.address).toBe("Zone 4, Abidjan")
    expect(delivery.status).toBe("PENDING")
  })

  it("should update delivery status and assign driver", async () => {
    const delivery = await DeliveryService.createDeliveryOrder({
      orderId,
      address: "Plateau, Abidjan",
    })

    const updated = await DeliveryService.updateDeliveryStatus(
      delivery.id,
      "ASSIGNED" as DeliveryOrderStatus,
      driverUserId
    )

    expect(updated.status).toBe("ASSIGNED")
    expect(updated.livreurId).toBe(driverUserId)
    expect(updated.startedAt).toBeDefined()

    const completed = await DeliveryService.updateDeliveryStatus(
      delivery.id,
      "DELIVERED" as DeliveryOrderStatus
    )
    expect(completed.status).toBe("DELIVERED")
    expect(completed.deliveredAt).toBeDefined()
  })
})
