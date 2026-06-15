import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoyaltyService } from '@/services/loyalty.service'
import { prisma } from '@/lib/db'
import { LoyaltyTransactionType } from '@prisma/client'

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      loyaltyCustomer: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      loyaltyTransaction: {
        create: vi.fn(),
      },
      loyaltyReward: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        createMany: vi.fn(),
      },
    },
  }
})

describe('LoyaltyService (New Module)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCustomerByPhone', () => {
    it('should find a loyalty customer by phone', async () => {
      const mockCustomer = {
        id: 'lc-123',
        phone: '+2250707070707',
        nom: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        points: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.loyaltyCustomer.findUnique).mockResolvedValue(mockCustomer)

      const result = await LoyaltyService.getCustomerByPhone('+2250707070707')

      expect(prisma.loyaltyCustomer.findUnique).toHaveBeenCalledWith({
        where: { phone: '+2250707070707' },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      })
      expect(result).toEqual(mockCustomer)
    })
  })

  describe('createCustomer', () => {
    it('should create a new loyalty customer', async () => {
      const mockCustomer = {
        id: 'lc-123',
        phone: '+2250707070707',
        nom: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        points: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.loyaltyCustomer.create).mockResolvedValue(mockCustomer)

      const result = await LoyaltyService.createCustomer('+2250707070707', 'Jean Dupont', 'jean.dupont@email.com')

      expect(prisma.loyaltyCustomer.create).toHaveBeenCalledWith({
        data: {
          phone: '+2250707070707',
          nom: 'Jean Dupont',
          email: 'jean.dupont@email.com',
          points: 0,
        },
      })
      expect(result).toEqual(mockCustomer)
    })
  })

  describe('earnPoints', () => {
    it('should earn points (1 point per 100 FCFA)', async () => {
      const mockCustomer = {
        id: 'lc-123',
        phone: '+2250707070707',
        nom: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        points: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockTransaction = {
        id: 'lt-999',
        customerId: 'lc-123',
        orderId: 'order-123',
        type: 'EARN' as LoyaltyTransactionType,
        points: 5,
        description: 'Points accumulés sur la commande #ER-123',
        createdAt: new Date(),
      }

      vi.mocked(prisma.loyaltyCustomer.update).mockResolvedValue(mockCustomer)
      vi.mocked(prisma.loyaltyTransaction.create).mockResolvedValue(mockTransaction)

      const result = await LoyaltyService.earnPoints('lc-123', 'order-123', 550)

      expect(prisma.loyaltyCustomer.update).toHaveBeenCalledWith({
        where: { id: 'lc-123' },
        data: { points: { increment: 5 } },
      })
      expect(prisma.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          customerId: 'lc-123',
          orderId: 'order-123',
          type: 'EARN',
          points: 5,
          description: 'Points accumulés sur la commande #ER-123',
        },
      })
      expect(result).toEqual({ customer: mockCustomer, transaction: mockTransaction })
    })

    it('should not earn points if amount is less than 100 FCFA', async () => {
      const result = await LoyaltyService.earnPoints('lc-123', 'order-123', 50)
      expect(result).toBeNull()
      expect(prisma.loyaltyCustomer.update).not.toHaveBeenCalled()
    })
  })

  describe('redeemPoints', () => {
    it('should successfully redeem points if customer has enough balance', async () => {
      const mockReward = {
        id: 'rwd-123',
        code: 'RWD_SODA',
        label: 'Soda Offert',
        description: 'Un soda gratuit',
        pointsCost: 50,
        isActive: true,
        createdAt: new Date(),
      }

      const mockCustomer = {
        id: 'lc-123',
        phone: '+2250707070707',
        nom: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        points: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockUpdatedCustomer = {
        ...mockCustomer,
        points: 70,
      }

      const mockTransaction = {
        id: 'lt-888',
        customerId: 'lc-123',
        orderId: 'order-123',
        type: 'REDEEM' as LoyaltyTransactionType,
        points: -50,
        description: 'Récompense utilisée : Soda Offert',
        createdAt: new Date(),
      }

      vi.mocked(prisma.loyaltyReward.findUnique).mockResolvedValue(mockReward)
      vi.mocked(prisma.loyaltyCustomer.findUnique).mockResolvedValue(mockCustomer)
      vi.mocked(prisma.loyaltyCustomer.update).mockResolvedValue(mockUpdatedCustomer)
      vi.mocked(prisma.loyaltyTransaction.create).mockResolvedValue(mockTransaction)

      const result = await LoyaltyService.redeemPoints('lc-123', 'rwd-123', 'order-123')

      expect(prisma.loyaltyCustomer.update).toHaveBeenCalledWith({
        where: { id: 'lc-123' },
        data: { points: { decrement: 50 } },
      })
      expect(prisma.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          customerId: 'lc-123',
          orderId: 'order-123',
          type: 'REDEEM',
          points: -50,
          description: 'Récompense utilisée : Soda Offert',
        },
      })
      expect(result).toEqual({ customer: mockUpdatedCustomer, transaction: mockTransaction, reward: mockReward })
    })

    it('should throw error if points cost exceeds balance', async () => {
      const mockReward = {
        id: 'rwd-123',
        code: 'RWD_BURGER',
        label: 'Burger Offert',
        description: 'Un burger offert',
        pointsCost: 200,
        isActive: true,
        createdAt: new Date(),
      }

      const mockCustomer = {
        id: 'lc-123',
        phone: '+2250707070707',
        nom: 'Jean Dupont',
        email: 'jean.dupont@email.com',
        points: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.loyaltyReward.findUnique).mockResolvedValue(mockReward)
      vi.mocked(prisma.loyaltyCustomer.findUnique).mockResolvedValue(mockCustomer)

      await expect(LoyaltyService.redeemPoints('lc-123', 'rwd-123')).rejects.toThrow(
        'Points de fidélité insuffisants (120 disponibles, 200 requis)'
      )
    })
  })
})
