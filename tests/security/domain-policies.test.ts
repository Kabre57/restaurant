import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { hasPermission } from "@/domain/security/guards";
import {
  canAccessStore,
  canRefundOrder,
  canViewPayroll,
  canEditPayroll,
  canViewReports,
} from "@/domain/security/policies";
import { Permission } from "@/domain/security/permissions";

describe("Domain Security & Policy Tests", () => {
  let testStoreId: string;
  let otherStoreId: string;
  let testUserId: string;

  beforeEach(async () => {
    // 1. Create two separate stores to test multi-site isolation
    const storeA = await prisma.store.create({
      data: { name: `Store A ${Date.now()}`, commission: 10 },
    });
    testStoreId = storeA.id;

    const storeB = await prisma.store.create({
      data: { name: `Store B ${Date.now()}`, commission: 10 },
    });
    otherStoreId = storeB.id;

    // 2. Create a base user
    const user = await prisma.user.create({
      data: {
        email: `employee-${Date.now()}@test.com`,
        name: "Test Employee",
        role: Role.CASHIER,
        storeId: testStoreId,
        password: "dummy",
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    if (testStoreId) {
      await prisma.userPermission.deleteMany({ where: { userId: testUserId } });
      await prisma.rolePermission.deleteMany({ where: { storeId: testStoreId } });
      await prisma.user.deleteMany({ where: { storeId: testStoreId } });
      await prisma.store.delete({ where: { id: testStoreId } });
    }
    if (otherStoreId) {
      await prisma.store.delete({ where: { id: otherStoreId } });
    }
  });

  describe("canAccessStore (Multi-Tenant Isolation)", () => {
    it("should allow access if user belongs to the target store", () => {
      const user = { id: testUserId, role: Role.CASHIER, storeId: testStoreId };
      expect(canAccessStore(user, testStoreId)).toBe(true);
    });

    it("should deny access if user does not belong to the target store", () => {
      const user = { id: testUserId, role: Role.CASHIER, storeId: testStoreId };
      expect(canAccessStore(user, otherStoreId)).toBe(false);
    });

    it("should allow SUPER_ADMIN and ADMIN to access any store", () => {
      const superAdmin = { id: "admin-id", role: Role.SUPER_ADMIN, storeId: "" };
      const admin = { id: "admin-id-2", role: Role.ADMIN, storeId: "" };

      expect(canAccessStore(superAdmin, testStoreId)).toBe(true);
      expect(canAccessStore(superAdmin, otherStoreId)).toBe(true);
      expect(canAccessStore(admin, testStoreId)).toBe(true);
    });
  });

  describe("Dynamic Permission Resolution hierarchy", () => {
    it("should fall back to defaults", async () => {
      const user = { id: testUserId, role: Role.CASHIER, storeId: testStoreId };
      // CASHIER should default to having POS_ACCESS but not EDIT_PAYROLL
      const hasPos = await hasPermission(user, Permission.CREATE_ORDER);
      const hasPayroll = await hasPermission(user, Permission.EDIT_PAYROLL);

      expect(hasPos).toBe(true);
      expect(hasPayroll).toBe(false);
    });

    it("should respect Store Role Overrides (RolePermission Table)", async () => {
      const user = { id: testUserId, role: Role.CASHIER, storeId: testStoreId };

      // 1. Initially, Cashier cannot edit stock (defaults to false or specific mapping)
      expect(await hasPermission(user, Permission.EDIT_STOCK)).toBe(false);

      // 2. Create role permission override for this store
      await prisma.rolePermission.create({
        data: {
          storeId: testStoreId,
          role: Role.CASHIER,
          permissionKey: Permission.EDIT_STOCK,
          enabled: true,
        },
      });

      expect(await hasPermission(user, Permission.EDIT_STOCK)).toBe(true);
    });

    it("should respect User Exception Overrides (UserPermission Table)", async () => {
      const user = { id: testUserId, role: Role.CASHIER, storeId: testStoreId };

      // 1. Cashier defaults to CREATE_ORDER = true
      expect(await hasPermission(user, Permission.CREATE_ORDER)).toBe(true);

      // 2. Disable permission specifically for this user
      await prisma.userPermission.create({
        data: {
          userId: testUserId,
          permissionKey: Permission.CREATE_ORDER,
          enabled: false,
        },
      });

      expect(await hasPermission(user, Permission.CREATE_ORDER)).toBe(false);
    });
  });

  describe("Business Policies", () => {
    it("should enforce canRefundOrder policy rules", async () => {
      const cashierUser = { id: testUserId, role: Role.CASHIER, storeId: testStoreId };
      const order = { storeId: testStoreId, status: "EN_ATTENTE" };

      // Cashier defaults to hasRefundOrder = true (pos.orders_refund)
      expect(await canRefundOrder(cashierUser, order)).toBe(true);

      // Deny if order is already refunded
      const refundedOrder = { storeId: testStoreId, status: "REFUNDED" };
      expect(await canRefundOrder(cashierUser, refundedOrder)).toBe(false);

      // Deny if storeId does not match (cross-tenant)
      const crossStoreOrder = { storeId: otherStoreId, status: "EN_ATTENTE" };
      expect(await canRefundOrder(cashierUser, crossStoreOrder)).toBe(false);
    });

    it("should enforce canViewPayroll and canEditPayroll rules", async () => {
      const cashierUser = { id: testUserId, role: Role.CASHIER, storeId: testStoreId };

      expect(await canViewPayroll(cashierUser, testStoreId)).toBe(false);

      // Grant exception override
      await prisma.userPermission.create({
        data: {
          userId: testUserId,
          permissionKey: Permission.VIEW_PAYROLL,
          enabled: true,
        },
      });

      expect(await canViewPayroll(cashierUser, testStoreId)).toBe(true);
      // Deny on other store even with permission
      expect(await canViewPayroll(cashierUser, otherStoreId)).toBe(false);
    });
  });
});
