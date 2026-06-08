import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRolePermissions, updateRolePermission, resetRolePermissions } from '@/app/actions/auth/permissions'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      rolePermission: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn()
      }
    }
  }
})

vi.mock('next/cache', () => {
  return {
    revalidatePath: vi.fn()
  }
})

vi.mock('@/lib/auth-guard', () => {
  return {
    requireAuth: vi.fn().mockResolvedValue({
      storeId: 'store-1',
      role: 'RESTAURATEUR',
      userId: 'user-1',
      email: 'manager@test.local'
    }),
    assertSameStore: vi.fn()
  }
})

describe('Permission Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRolePermissions', () => {
    it('should merge database configurations with defaults', async () => {
      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([
        {
          id: 'p-1',
          storeId: 'store-1',
          role: 'CASHIER',
          permissionKey: 'STOCK_ACCESS',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])

      const res = await getRolePermissions('store-1', 'CASHIER')
      expect(res.POS_ACCESS).toBe(true) // default
      expect(res.STOCK_ACCESS).toBe(true) // db override
    })
  })

  describe('updateRolePermission', () => {
    it('should successfully upsert role permission override', async () => {
      vi.mocked(prisma.rolePermission.upsert).mockResolvedValue({
        id: 'p-1',
        storeId: 'store-1',
        role: 'CASHIER',
        permissionKey: 'POS_ACCESS',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const res = await updateRolePermission('store-1', 'CASHIER', 'POS_ACCESS', false)
      expect(res.success).toBe(true)
      expect(prisma.rolePermission.upsert).toHaveBeenCalled()
    })
  })
})
