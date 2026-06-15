import { describe, it, expect } from 'vitest'
import { Role } from '@prisma/client'
import {
  MODULES_LIST,
  PERMISSIONS_LIST,
  DEFAULT_PERMISSIONS
} from '@/app/utils/permissions-config'

describe('Permissions Configuration Integrity', () => {
  it('should load MODULES_LIST and check structure', () => {
    expect(MODULES_LIST).toBeInstanceOf(Array)
    expect(MODULES_LIST.length).toBeGreaterThan(0)
    for (const m of MODULES_LIST) {
      expect(m).toHaveProperty('id')
      expect(m).toHaveProperty('name')
      expect(m).toHaveProperty('desc')
      expect(m).toHaveProperty('pages')
      expect(m.pages).toBeInstanceOf(Array)
    }
  })

  it('should load PERMISSIONS_LIST and ensure no duplicate keys', () => {
    expect(PERMISSIONS_LIST).toBeInstanceOf(Array)
    expect(PERMISSIONS_LIST.length).toBeGreaterThan(0)

    const keys = PERMISSIONS_LIST.map(p => p.key)
    const uniqueKeys = new Set(keys)
    expect(keys.length).toBe(uniqueKeys.size)
  })

  it('should ensure all system roles have defined defaults', () => {
    const roles: Role[] = [
      'RESTAURATEUR',
      'MANAGER',
      'CASHIER',
      'SERVER',
      'KITCHEN',
      'DELIVERY',
      'LIVREUR',
      'ADMIN',
      'SUPER_ADMIN',
      'STORE_MANAGER',
      'STORE_EMPLOYEE'
    ]

    for (const role of roles) {
      expect(DEFAULT_PERMISSIONS).toHaveProperty(role)
      const rolePerms = DEFAULT_PERMISSIONS[role]
      expect(rolePerms).toBeTypeOf('object')

      // Legacy global keys must be resolved
      expect(rolePerms).toHaveProperty('POS_ACCESS')
      expect(rolePerms).toHaveProperty('CASH_DRAWER_ACCESS')
      expect(rolePerms).toHaveProperty('KDS_ACCESS')
      expect(rolePerms).toHaveProperty('STOCK_ACCESS')
      expect(rolePerms).toHaveProperty('STOCK_ADJUSTMENT')
      expect(rolePerms).toHaveProperty('HR_ACCESS')
      expect(rolePerms).toHaveProperty('ANALYTICS_ACCESS')
      expect(rolePerms).toHaveProperty('CONFIG_ACCESS')
    }
  })

  it('should verify correct default configurations for RESTAURATEUR vs CASHIER', () => {
    const restaurateur = DEFAULT_PERMISSIONS.RESTAURATEUR
    const cashier = DEFAULT_PERMISSIONS.CASHIER

    // Restaurateur should have full access
    expect(restaurateur.POS_ACCESS).toBe(true)
    expect(restaurateur.CASH_DRAWER_ACCESS).toBe(true)
    expect(restaurateur.STOCK_ACCESS).toBe(true)
    expect(restaurateur.HR_ACCESS).toBe(true)
    expect(restaurateur.CONFIG_ACCESS).toBe(true)
    expect(restaurateur['dashboard.view']).toBe(true)

    // Cashier should have cashier access but no HR or config access
    expect(cashier.POS_ACCESS).toBe(true)
    expect(cashier.CASH_DRAWER_ACCESS).toBe(true)
    expect(cashier.STOCK_ACCESS).toBe(false)
    expect(cashier.HR_ACCESS).toBe(false)
    expect(cashier.CONFIG_ACCESS).toBe(false)
    expect(cashier['dashboard.view']).toBe(false)
  })
})
