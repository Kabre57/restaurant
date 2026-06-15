import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canAccessStore,
  canRefundOrder,
  canViewPayroll,
  canEditPayroll,
  canViewReports,
  canExportReports,
  canModifyInventory,
  canViewCostPrice,
  canViewMargin
} from '@/domain/security/policies';
import { hasPermission } from '@/domain/security/guards';
import { Role } from '@prisma/client';

vi.mock('@/domain/security/guards', () => ({
  hasPermission: vi.fn(),
}));

describe('Security Policies Domain Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canAccessStore', () => {
    it('should allow SUPER_ADMIN and ADMIN regardless of storeId', () => {
      expect(canAccessStore({ id: 'u1', role: Role.SUPER_ADMIN, storeId: 'store-A' }, 'store-B')).toBe(true);
      expect(canAccessStore({ id: 'u2', role: Role.ADMIN, storeId: 'store-A' }, 'store-B')).toBe(true);
    });

    it('should restrict other roles to their matching storeId', () => {
      expect(canAccessStore({ id: 'u3', role: Role.CASHIER, storeId: 'store-A' }, 'store-A')).toBe(true);
      expect(canAccessStore({ id: 'u3', role: Role.CASHIER, storeId: 'store-A' }, 'store-B')).toBe(false);
    });
  });

  describe('canRefundOrder', () => {
    it('should reject if user has no store access', async () => {
      const user = { id: 'u1', role: Role.CASHIER, storeId: 'store-A' };
      const order = { storeId: 'store-B', status: 'COMPLETED' };
      const result = await canRefundOrder(user, order);
      expect(result).toBe(false);
    });

    it('should reject if order is already refunded or cancelled', async () => {
      const user = { id: 'u1', role: Role.CASHIER, storeId: 'store-A' };
      const order1 = { storeId: 'store-A', status: 'CANCELLED' };
      const order2 = { storeId: 'store-A', status: 'REFUNDED' };
      expect(await canRefundOrder(user, order1)).toBe(false);
      expect(await canRefundOrder(user, order2)).toBe(false);
    });

    it('should delegate check to hasPermission if store and status are valid', async () => {
      const user = { id: 'u1', role: Role.CASHIER, storeId: 'store-A' };
      const order = { storeId: 'store-A', status: 'COMPLETED' };
      
      vi.mocked(hasPermission).mockResolvedValue(true);
      expect(await canRefundOrder(user, order)).toBe(true);

      vi.mocked(hasPermission).mockResolvedValue(false);
      expect(await canRefundOrder(user, order)).toBe(false);
    });
  });

  describe('Other Policies delegation', () => {
    const user = { id: 'u1', role: Role.CASHIER, storeId: 'store-A' };

    it('should correctly delegate canViewPayroll', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      expect(await canViewPayroll(user, 'store-A')).toBe(true);
    });

    it('should correctly delegate canEditPayroll', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false);
      expect(await canEditPayroll(user, 'store-A')).toBe(false);
    });

    it('should correctly delegate canViewReports', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      expect(await canViewReports(user, 'store-A')).toBe(true);
    });

    it('should correctly delegate canExportReports', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      expect(await canExportReports(user, 'store-A')).toBe(true);
    });

    it('should correctly delegate canModifyInventory', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      expect(await canModifyInventory(user, 'store-A')).toBe(true);
    });

    it('should correctly delegate canViewCostPrice', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      expect(await canViewCostPrice(user, 'store-A')).toBe(true);
    });

    it('should correctly delegate canViewMargin', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      expect(await canViewMargin(user, 'store-A')).toBe(true);
    });
  });
});
