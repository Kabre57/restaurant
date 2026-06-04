import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clockInUser, clockOutUser, getPresenceLogs, saveManualTimecard, getHoursWorkedReport } from '@/app/actions/timecards'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      timecard: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn()
      }
    }
  }
})

vi.mock('next/cache', () => {
  return {
    revalidatePath: vi.fn()
  }
})

describe('Timecard Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('clockInUser', () => {
    it('should successfully clock in a user if no active shift exists', async () => {
      vi.mocked(prisma.timecard.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.timecard.create).mockResolvedValue({
        id: 'tc-1',
        storeId: 'store-1',
        userId: 'user-1',
        clockIn: new Date(),
        clockOut: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const res = await clockInUser('store-1', 'user-1')
      expect(res.success).toBe(true)
      expect(prisma.timecard.create).toHaveBeenCalled()
    })

    it('should return error if active shift already exists', async () => {
      vi.mocked(prisma.timecard.findFirst).mockResolvedValue({
        id: 'tc-active',
        storeId: 'store-1',
        userId: 'user-1',
        clockIn: new Date(),
        clockOut: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const res = await clockInUser('store-1', 'user-1')
      expect(res.success).toBe(false)
      expect(res.error).toContain('déjà pointé')
    })
  })

  describe('clockOutUser', () => {
    it('should successfully clock out a user if active shift exists', async () => {
      const clockInTime = new Date(Date.now() - 3600000 * 2) // 2 hours ago
      vi.mocked(prisma.timecard.findFirst).mockResolvedValue({
        id: 'tc-active',
        storeId: 'store-1',
        userId: 'user-1',
        clockIn: clockInTime,
        clockOut: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      vi.mocked(prisma.timecard.update).mockResolvedValue({
        id: 'tc-active',
        storeId: 'store-1',
        userId: 'user-1',
        clockIn: clockInTime,
        clockOut: new Date(),
        duration: 2.0,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const res = await clockOutUser('store-1', 'user-1')
      expect(res.success).toBe(true)
      expect(prisma.timecard.update).toHaveBeenCalled()
    })

    it('should return error if no active shift exists', async () => {
      vi.mocked(prisma.timecard.findFirst).mockResolvedValue(null)

      const res = await clockOutUser('store-1', 'user-1')
      expect(res.success).toBe(false)
      expect(res.error).toContain('Aucun pointage')
    })
  })
})
