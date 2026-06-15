import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRolePermissions,
  updateRolePermission,
  resetRolePermissions,
  getUserPermissions,
  updateUserPermission,
  getCustomPermissions,
  addCustomPermission,
  deleteCustomPermission
} from '@/app/actions/auth/permissions'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      rolePermission: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn()
      },
      userPermission: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn()
      },
      customPermission: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn()
      },
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn()
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

  describe('getUserPermissions', () => {
    it('should successfully merge user overrides with role base', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-2',
        role: 'CASHIER',
        storeId: 'store-1'
      } as any)

      vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([])
      vi.mocked(prisma.customPermission.findMany).mockResolvedValue([])
      vi.mocked(prisma.userPermission.findMany).mockResolvedValue([
        {
          id: 'up-1',
          userId: 'user-2',
          permissionKey: 'POS_ACCESS',
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])

      const res = await getUserPermissions('store-1', 'user-2')
      expect(res.success).toBe(true)
      expect(res.permissions?.POS_ACCESS).toEqual({
        value: false,
        status: 'forbidden'
      })
      // Should inherit cashier defaults for others
      expect(res.permissions?.CASH_DRAWER_ACCESS).toEqual({
        value: true,
        status: 'inherited'
      })
    })
  })

  describe('updateUserPermission', () => {
    it('should delete override if status is inherited', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-2',
        storeId: 'store-1'
      } as any)

      vi.mocked(prisma.userPermission.deleteMany).mockResolvedValue({ count: 1 })

      const res = await updateUserPermission('store-1', 'user-2', 'POS_ACCESS', 'inherited')
      expect(res.success).toBe(true)
      expect(prisma.userPermission.deleteMany).toHaveBeenCalled()
    })

    it('should upsert override if status is authorized or forbidden', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-2',
        storeId: 'store-1'
      } as any)

      vi.mocked(prisma.userPermission.upsert).mockResolvedValue({} as any)

      const res = await updateUserPermission('store-1', 'user-2', 'POS_ACCESS', 'authorized')
      expect(res.success).toBe(true)
      expect(prisma.userPermission.upsert).toHaveBeenCalled()
    })
  })

  describe('Custom Permissions', () => {
    it('should create a new custom permission if valid', async () => {
      vi.mocked(prisma.customPermission.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.customPermission.create).mockResolvedValue({
        id: 'cp-1',
        storeId: 'store-1',
        permissionKey: 'custom.my_key',
        name: 'My Custom Key',
        desc: 'Testing',
        module: 'commercial_pos',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const res = await addCustomPermission('store-1', {
        key: 'my_key',
        name: 'My Custom Key',
        desc: 'Testing',
        module: 'commercial_pos'
      })

      expect(res.success).toBe(true)
      expect(res.data?.permissionKey).toBe('custom.my_key')
      expect(prisma.customPermission.create).toHaveBeenCalled()
    })

    it('should fail if custom permission key already exists', async () => {
      vi.mocked(prisma.customPermission.findUnique).mockResolvedValue({
        id: 'cp-1'
      } as any)

      const res = await addCustomPermission('store-1', {
        key: 'existing_key',
        name: 'Existing',
        desc: 'Testing',
        module: 'commercial_pos'
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe("Cette clé de permission existe déjà pour cet établissement.")
    })
  })
})
