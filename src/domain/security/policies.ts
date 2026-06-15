import { Role } from '@prisma/client';

/**
 * Rôles d'administration globale
 */
const HIGH_PRIVILEGED_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'RESTAURATEUR'];

/**
 * Détermine si un rôle peut effectuer des remboursements de commandes
 */
export function canRefundOrder(role: Role): boolean {
  return [...HIGH_PRIVILEGED_ROLES, 'MANAGER'].includes(role);
}

/**
 * Détermine si un rôle a accès aux rapports analytiques et financiers
 */
export function canViewAnalytics(role: Role): boolean {
  return [...HIGH_PRIVILEGED_ROLES, 'MANAGER', 'STORE_MANAGER'].includes(role);
}

/**
 * Détermine si un rôle a le droit de modifier la paie ou de gérer les contrats RH
 */
export function canManagePayroll(role: Role): boolean {
  return HIGH_PRIVILEGED_ROLES.includes(role);
}

/**
 * Détermine si un rôle peut modifier la configuration globale de l'établissement
 */
export function canManageSettings(role: Role): boolean {
  return HIGH_PRIVILEGED_ROLES.includes(role);
}

/**
 * Détermine si un rôle a les droits de mouvementer les stocks (inventaire, commandes)
 */
export function canManageInventory(role: Role): boolean {
  return [
    ...HIGH_PRIVILEGED_ROLES,
    'MANAGER',
    'STORE_MANAGER',
    'STORE_EMPLOYEE'
  ].includes(role);
}
