import { describe, it, expect } from 'vitest';
import {
  canRefundOrder,
  canViewAnalytics,
  canManagePayroll,
  canManageSettings,
  canManageInventory
} from '@/domain/security/policies';

describe('Security Policies Domain Tests', () => {
  it('should validate refund order permissions correctly', () => {
    expect(canRefundOrder('SUPER_ADMIN')).toBe(true);
    expect(canRefundOrder('ADMIN')).toBe(true);
    expect(canRefundOrder('RESTAURATEUR')).toBe(true);
    expect(canRefundOrder('MANAGER')).toBe(true);
    expect(canRefundOrder('SERVER')).toBe(false);
    expect(canRefundOrder('CASHIER')).toBe(false);
  });

  it('should validate view analytics permissions correctly', () => {
    expect(canViewAnalytics('SUPER_ADMIN')).toBe(true);
    expect(canViewAnalytics('STORE_MANAGER')).toBe(true);
    expect(canViewAnalytics('SERVER')).toBe(false);
  });

  it('should validate payroll permissions correctly', () => {
    expect(canManagePayroll('SUPER_ADMIN')).toBe(true);
    expect(canManagePayroll('ADMIN')).toBe(true);
    expect(canManagePayroll('RESTAURATEUR')).toBe(true);
    expect(canManagePayroll('MANAGER')).toBe(false);
    expect(canManagePayroll('STORE_MANAGER')).toBe(false);
  });

  it('should validate settings permissions correctly', () => {
    expect(canManageSettings('SUPER_ADMIN')).toBe(true);
    expect(canManageSettings('MANAGER')).toBe(false);
  });

  it('should validate inventory permissions correctly', () => {
    expect(canManageInventory('STORE_EMPLOYEE')).toBe(true);
    expect(canManageInventory('SERVER')).toBe(false);
  });
});
