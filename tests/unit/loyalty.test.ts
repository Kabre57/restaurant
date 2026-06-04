import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creditLoyaltyPoints, redeemLoyaltyPoints, validatePromotion } from '@/app/actions/loyalty'
import { prisma } from '@/lib/db'

// Mock de Prisma
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      loyalty: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      promotion: {
        findFirst: vi.fn(),
      },
      customer: {
        findUnique: vi.fn(),
      },
    },
  }
})

// Mock de requireAuth pour éviter les erreurs hors requête Next.js
vi.mock('@/lib/auth-guard', () => {
  return {
    requireAuth: vi.fn().mockResolvedValue({
      storeId: 'store-1',
      role: 'RESTAURATEUR',
      userId: 'user-1'
    }),
    assertSameStore: vi.fn()
  }
})

describe('Loyalty Points Calculation & Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'cust-1',
      firstName: 'Client',
      lastName: 'Test',
      phone: '0707070707',
      email: 'test@example.com',
      notes: null,
      storeId: 'store-1',
      createdAt: new Date(),
      updatedAt: new Date()
    })
  })

  describe('creditLoyaltyPoints', () => {
    it('should add 1 point per 100 FCFA spent', async () => {
      // 550 FCFA -> 5 points
      const customerId = 'cust-1'
      const totalAmount = 550

      vi.mocked(prisma.loyalty.upsert).mockResolvedValue({
        id: 'loy-1',
        customerId,
        points: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await creditLoyaltyPoints(customerId, totalAmount)

      expect(res.success).toBe(true)
      expect(res.pointsAdded).toBe(5)
      expect(prisma.loyalty.upsert).toHaveBeenCalledWith({
        where: { customerId },
        update: { points: { increment: 5 } },
        create: { customerId, points: 5 },
      })
    })

    it('should return 0 points for purchase below 100 FCFA', async () => {
      const res = await creditLoyaltyPoints('cust-1', 99)
      expect(res.success).toBe(true)
      expect(res.pointsAdded).toBe(0)
      expect(prisma.loyalty.upsert).not.toHaveBeenCalled()
    })
  })

  describe('redeemLoyaltyPoints', () => {
    it('should successfully redeem points if balance is sufficient', async () => {
      const customerId = 'cust-1'
      
      vi.mocked(prisma.loyalty.findUnique).mockResolvedValue({
        id: 'loy-1',
        customerId,
        points: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(prisma.loyalty.update).mockResolvedValue({
        id: 'loy-1',
        customerId,
        points: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await redeemLoyaltyPoints(customerId, 100)

      expect(res.success).toBe(true)
      expect(res.remainingPoints).toBe(50)
      expect(prisma.loyalty.update).toHaveBeenCalledWith({
        where: { customerId },
        data: { points: { decrement: 100 } },
      })
    })

    it('should fail if points balance is insufficient', async () => {
      const customerId = 'cust-1'

      vi.mocked(prisma.loyalty.findUnique).mockResolvedValue({
        id: 'loy-1',
        customerId,
        points: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await redeemLoyaltyPoints(customerId, 50)

      expect(res.success).toBe(false)
      expect(res.error).toContain('Points insuffisants')
      expect(prisma.loyalty.update).not.toHaveBeenCalled()
    })
  })

  describe('validatePromotion', () => {
    it('should calculate discount correctly for flat amount promotions', async () => {
      const now = new Date()
      vi.mocked(prisma.promotion.findFirst).mockResolvedValue({
        id: 'promo-123',
        code: 'WELCOME500',
        discountType: 'FIXED_AMOUNT',
        value: 500,
        isActive: true,
        startDate: null,
        endDate: null,
        usageLimit: null,
        usedCount: 0,
        storeId: 'store-1',
        description: null,
        createdAt: now,
        updatedAt: now,
      })

      const res = await validatePromotion('WELCOME500', 'store-1', 1500)
      expect(res.success).toBe(true)
      expect(res.discount).toBe(500)
    })

    it('should calculate discount correctly for percentage promotions', async () => {
      const now = new Date()
      vi.mocked(prisma.promotion.findFirst).mockResolvedValue({
        id: 'promo-123',
        code: '10PERCENT',
        discountType: 'PERCENTAGE',
        value: 10,
        isActive: true,
        startDate: null,
        endDate: null,
        usageLimit: null,
        usedCount: 0,
        storeId: 'store-1',
        description: null,
        createdAt: now,
        updatedAt: now,
      })

      const res = await validatePromotion('10PERCENT', 'store-1', 2000)
      expect(res.success).toBe(true)
      expect(res.discount).toBe(200)
    })

    it('should return error if promotion has not started yet', async () => {
      const now = new Date()
      const futureDate = new Date(now.getTime() + 1000 * 60 * 60) // in 1 hour
      vi.mocked(prisma.promotion.findFirst).mockResolvedValue({
        id: 'promo-123',
        code: 'FUTURE',
        discountType: 'FIXED_AMOUNT',
        value: 100,
        isActive: true,
        startDate: futureDate,
        endDate: null,
        usageLimit: null,
        usedCount: 0,
        storeId: 'store-1',
        description: null,
        createdAt: now,
        updatedAt: now,
      })

      const res = await validatePromotion('FUTURE', 'store-1', 1000)
      expect(res.success).toBe(false)
      expect(res.error).toContain('pas encore active')
    })

    it('should return error if promotion is expired', async () => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour ago
      vi.mocked(prisma.promotion.findFirst).mockResolvedValue({
        id: 'promo-123',
        code: 'EXPIRED',
        discountType: 'FIXED_AMOUNT',
        value: 100,
        isActive: true,
        startDate: null,
        endDate: pastDate,
        usageLimit: null,
        usedCount: 0,
        storeId: 'store-1',
        description: null,
        createdAt: now,
        updatedAt: now,
      })

      const res = await validatePromotion('EXPIRED', 'store-1', 1000)
      expect(res.success).toBe(false)
      expect(res.error).toContain('expirée')
    })
  })
})
