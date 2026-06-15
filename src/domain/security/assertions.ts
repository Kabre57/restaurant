import { ForbiddenError } from "@/shared/errors";
import { canAccessStore } from "./policies";
import { hasPermission, SecurityUser } from "./guards";
import { Permission } from "./permissions";

/**
 * Asserts that the user has access to the specified store.
 * Throws ForbiddenError if access is denied.
 */
export function assertStoreAccess(user: SecurityUser, storeId: string): void {
  if (!canAccessStore(user, storeId)) {
    throw new ForbiddenError(
      `Accès refusé : vous n'avez pas l'autorisation d'accéder au magasin ${storeId}`
    );
  }
}

/**
 * Asserts that the user possesses the specified permission.
 * Throws ForbiddenError if permission check fails.
 */
export async function assertPermission(
  user: SecurityUser,
  permission: Permission | string
): Promise<void> {
  const allowed = await hasPermission(user, permission);
  if (!allowed) {
    throw new ForbiddenError(
      `Permission requise manquante : ${permission}`
    );
  }
}
