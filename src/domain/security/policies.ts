import { Permission } from './permissions';
import { hasPermission, SecurityUser } from './guards';

/**
 * Checks if a user has access to a specific store.
 * Super Admins and Admins can access any store. Others must match their storeId.
 */
export function canAccessStore(user: SecurityUser, storeId: string): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
  return user.storeId === storeId;
}

/**
 * Checks if a user can refund a specific order.
 */
export async function canRefundOrder(
  user: SecurityUser,
  order: { storeId: string; status: string }
): Promise<boolean> {
  if (!canAccessStore(user, order.storeId)) return false;
  
  // Already cancelled or refunded orders cannot be refunded again
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return false;
  }
  
  return hasPermission(user, Permission.REFUND_ORDER);
}

/**
 * Checks if a user can view payroll details.
 */
export async function canViewPayroll(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.VIEW_PAYROLL);
}

/**
 * Checks if a user can edit/generate payroll.
 */
export async function canEditPayroll(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.EDIT_PAYROLL);
}

/**
 * Checks if a user can view reports/analytics.
 */
export async function canViewReports(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.VIEW_REPORTS);
}

/**
 * Checks if a user can export reports.
 */
export async function canExportReports(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.EXPORT_REPORTS);
}

/**
 * Checks if a user can delete a product.
 */
export async function canDeleteProduct(
  user: SecurityUser,
  product: { storeId: string }
): Promise<boolean> {
  if (!canAccessStore(user, product.storeId)) return false;
  return hasPermission(user, 'admin.store_edit');
}

/**
 * Checks if a user can open a cash drawer shift.
 */
export async function canOpenShift(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.OPEN_SHIFT);
}

/**
 * Checks if a user can close a cash drawer shift.
 */
export async function canCloseShift(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.CLOSE_SHIFT);
}

/**
 * Checks if a user can access KDS kitchen dashboard.
 */
export async function canAccessKitchen(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, 'KDS_ACCESS');
}

/**
 * Checks if a user can modify stock/inventory.
 */
export async function canModifyInventory(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.EDIT_STOCK);
}

/**
 * Checks if a user can view product cost prices.
 */
export async function canViewCostPrice(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.VIEW_COST_PRICE);
}

/**
 * Checks if a user can view margins.
 */
export async function canViewMargin(user: SecurityUser, storeId: string): Promise<boolean> {
  if (!canAccessStore(user, storeId)) return false;
  return hasPermission(user, Permission.VIEW_MARGIN);
}

/**
 * Checks if a user has permission to create order on a table.
 */
export function canCreateTableOrder(user: SecurityUser, storeId: string): boolean {
  return canAccessStore(user, storeId);
}

/**
 * Checks if a user has permission to attach an order to a table.
 */
export function canAttachOrderToTable(user: SecurityUser, table: { storeId: string }): boolean {
  return canAccessStore(user, table.storeId);
}
