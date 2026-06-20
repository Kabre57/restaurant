// tests/integration/loyalty-integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { prisma } from "@/lib/db"
import { createOrder } from "@/app/actions/orders/orders"
import { OrderType, PaymentStatus } from "@prisma/client"
import crypto from "crypto"

// Mocks requis pour Next.js Actions
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "manager@test.com",
      role: "ADMIN",
      storeId: "test-store-loyalty-integration",
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
    getCached: vi.fn().mockImplementation((key, ttl, cb) => cb()),
  }
})

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("Loyalty Module Integration with POS flow", () => {
  let testStoreId: string
  let categoryId: string
  let productId: string
  let loyaltyCustomerId: string

  beforeEach(async () => {
    // 1. Créer un store
    const store = await prisma.store.create({
      data: {
        name: `Resto Loyalty Integration ${Date.now()}`,
        commission: 15.0,
        storeSettings: {
          create: {
            rounding: "ROUND_NEAREST",
            roundingValue: 5,
            workflowType: "CASHIER_ONLY",
          },
        },
      },
    })
    testStoreId = store.id

    // 2. Créer une catégorie
    const category = await prisma.category.create({
      data: {
        storeId: testStoreId,
        name: "Boissons tests",
      },
    })
    categoryId = category.id

    // 3. Créer un produit
    const product = await prisma.product.create({
      data: {
        storeId: testStoreId,
        categoryId: categoryId,
        name: "Coca Cola",
        price: 1000,
        costPrice: 400,
        trackStock: false,
        stockQuantity: 100,
        isAvailable: true,
      },
    })
    productId = product.id

    // 4. Créer un LoyaltyCustomer avec 150 points par défaut
    const phone = `+225${Math.floor(100000000 + Math.random() * 900000000)}`
    const customer = await prisma.loyaltyCustomer.create({
      data: {
        phone,
        nom: "Client Intégration",
        points: 150,
      },
    })
    loyaltyCustomerId = customer.id
  })

  afterEach(async () => {
    if (loyaltyCustomerId) {
      await prisma.loyaltyTransaction.deleteMany({
        where: { customerId: loyaltyCustomerId }
      })
      await prisma.loyaltyCustomer.delete({
        where: { id: loyaltyCustomerId }
      })
    }

    if (testStoreId) {
      // Nettoyage ordonné des éléments liés à ce store
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } }
      })
      await prisma.payment.deleteMany({
        where: { order: { storeId: testStoreId } }
      })
      await prisma.order.deleteMany({
        where: { storeId: testStoreId }
      })
      await prisma.product.deleteMany({
        where: { storeId: testStoreId }
      })
      await prisma.category.deleteMany({
        where: { storeId: testStoreId }
      })
      await prisma.storeSettings.deleteMany({
        where: { storeId: testStoreId }
      })
      await prisma.store.delete({
        where: { id: testStoreId }
      })
    }
  })

  it("doit attribuer correctement les points de fidélité lors d'un achat et déduire les points rachetés", async () => {
    // Commande 1 : Total = 3000 FCFA (3x Coca Cola à 1000 FCFA)
    // Points à gagner : 3000 / 100 = 30 points. Pas de points rachetés.
    const res1 = await createOrder({
      storeId: testStoreId,
      type: OrderType.DINE_IN,
      paymentMode: "ESPECES",
      paymentStatus: PaymentStatus.REUSSIE,
      discount: 0,
      customerId: loyaltyCustomerId,
      clientRequestId: crypto.randomUUID(),
      items: [
        {
          productId: productId,
          quantity: 3,
        },
      ],
    })

    expect(res1.success).toBe(true)
    expect(res1.order).toBeDefined()

    // Vérifier les points mis à jour : 150 + 35 = 185 points
    const customerAfterOrder1 = await prisma.loyaltyCustomer.findUnique({
      where: { id: loyaltyCustomerId }
    })
    expect(customerAfterOrder1?.points).toBe(180)

    // Vérifier qu'un transaction EARN a bien été créée
    const earnTx = await prisma.loyaltyTransaction.findFirst({
      where: {
        customerId: loyaltyCustomerId,
        orderId: res1.order?.id,
        type: "EARN",
      }
    })
    expect(earnTx).toBeDefined()
    expect(earnTx?.points).toBe(30)

    // Commande 2 : Total = 2000 FCFA (2x Coca Cola).
    // Points rachetés : 50 points.
    // Montant payé après remise : 2000 - 500 = 1500 FCFA.
    // TVA 18% : 270 FCFA. Total TTC = 1770 FCFA.
    // Points à gagner : 1770 / 100 = 17 points.
    // Solde final : 185 - 50 + 17 = 152 points.
    const res2 = await createOrder({
      storeId: testStoreId,
      type: OrderType.DINE_IN,
      paymentMode: "ESPECES",
      paymentStatus: PaymentStatus.REUSSIE,
      discount: 500, // 50 points * 10 FCFA/point
      customerId: loyaltyCustomerId,
      loyaltyPointsRedeemed: 50,
      clientRequestId: crypto.randomUUID(),
      items: [
        {
          productId: productId,
          quantity: 2,
        },
      ],
    })

    expect(res2.success).toBe(true)

    // Vérifier les points mis à jour : 185 - 50 + 17 = 152
    const customerAfterOrder2 = await prisma.loyaltyCustomer.findUnique({
      where: { id: loyaltyCustomerId }
    })
    expect(customerAfterOrder2?.points).toBe(145)

    // Vérifier les transactions pour la commande 2
    const earnTx2 = await prisma.loyaltyTransaction.findFirst({
      where: {
        customerId: loyaltyCustomerId,
        orderId: res2.order?.id,
        type: "EARN",
      }
    })
    expect(earnTx2?.points).toBe(15)

    const redeemTx = await prisma.loyaltyTransaction.findFirst({
      where: {
        customerId: loyaltyCustomerId,
        orderId: res2.order?.id,
        type: "REDEEM",
      }
    })
    expect(redeemTx?.points).toBe(-50)
  })
})
