import { assertStoreAccess } from "@/domain/security/assertions";
import { SecurityUser } from "@/domain/security/guards";
import { SecurityMonitor } from "./security-monitor";

/**
 * Validates that the authenticated user has authorization to access the target storeId.
 * Throws ForbiddenError and records a security incident in SecurityMonitor if violated.
 */
export function requireStoreAccess(user: SecurityUser, storeId: string): void {
  try {
    assertStoreAccess(user, storeId);
  } catch (error) {
    // Record cross-tenant breach attempt in SIEM/observability logs
    SecurityMonitor.trackCrossStoreAccess(user.id, user.storeId, storeId);
    throw error;
  }
}
export default requireStoreAccess;
