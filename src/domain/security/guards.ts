import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_PERMISSIONS } from "@/app/utils/permissions-config";
import { Permission } from "./permissions";

export interface SecurityUser {
  id: string;
  role: Role;
  storeId: string;
}

/**
 * Checks if a user has a specific permission.
 * Precedence:
 * 1. SUPER_ADMIN / ADMIN: Always true.
 * 2. User Exception: Explicit override for a specific user (UserPermission table).
 * 3. Store Role Override: Explicit override for a role in a specific store (RolePermission table).
 * 4. Default Permission: Preconfigured default permissions for the role (DEFAULT_PERMISSIONS).
 */
export async function hasPermission(
  user: SecurityUser,
  permission: Permission | string
): Promise<boolean> {
  const permKey = typeof permission === "string" ? permission : (permission as string);

  // 1. SUPER_ADMIN and ADMIN have absolute permissions
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    return true;
  }

  // 2. User Exception Override (UserPermission Table)
  const userOverride = await prisma.userPermission.findUnique({
    where: {
      userId_permissionKey: {
        userId: user.id,
        permissionKey: permKey,
      },
    },
  });

  if (userOverride !== null) {
    return userOverride.enabled;
  }

  // 3. Store Override (RolePermission Table)
  const roleOverride = await prisma.rolePermission.findUnique({
    where: {
      storeId_role_permissionKey: {
        storeId: user.storeId,
        role: user.role,
        permissionKey: permKey,
      },
    },
  });

  if (roleOverride !== null) {
    return roleOverride.enabled;
  }

  // 4. Default Permission
  const defaults = DEFAULT_PERMISSIONS[user.role];
  return defaults ? !!defaults[permKey] : false;
}
