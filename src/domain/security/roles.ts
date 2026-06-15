import { Role } from "@prisma/client";

export const HIGH_PRIVILEGED_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "RESTAURATEUR"];

export const MANAGEMENT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "RESTAURATEUR", "MANAGER", "STORE_MANAGER"];

export function isHighPrivileged(role: Role): boolean {
  return HIGH_PRIVILEGED_ROLES.includes(role);
}

export function isManagement(role: Role): boolean {
  return MANAGEMENT_ROLES.includes(role);
}
