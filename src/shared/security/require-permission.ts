import { assertPermission } from "@/domain/security/assertions";
import { SecurityUser } from "@/domain/security/guards";
import { Permission } from "@/domain/security/permissions";
import { SecurityMonitor } from "./security-monitor";

/**
 * Validates that the authenticated user possesses the required permission.
 * Throws ForbiddenError and records the violation in SecurityMonitor if missing.
 */
export async function requirePermission(
  user: SecurityUser,
  permission: Permission | string
): Promise<void> {
  try {
    await assertPermission(user, permission);
  } catch (error) {
    // Route to specialized anomaly trackers for security logging
    if (permission === Permission.REFUND_ORDER || permission === Permission.CANCEL_ORDER) {
      await SecurityMonitor.trackUnauthorizedRefund(user.id, user.storeId);
    } else {
      await SecurityMonitor.trackAccessDenied(user.id, user.storeId);
    }
    throw error;
  }
}
export default requirePermission;
