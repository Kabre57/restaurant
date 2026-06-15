import { Role } from '@prisma/client';

/**
 * Liste de tous les rôles système définis dans la base de données
 */
export const SYSTEM_ROLES: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'RESTAURATEUR',
  'MANAGER',
  'STORE_MANAGER',
  'CASHIER',
  'SERVER',
  'KITCHEN',
  'DELIVERY',
  'LIVREUR',
  'STORE_EMPLOYEE'
];

/**
 * Libellés conviviaux pour l'affichage des rôles dans l'interface d'administration
 */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Administrateur',
  ADMIN: 'Administrateur',
  RESTAURATEUR: 'Restaurateur / Propriétaire',
  MANAGER: 'Manager Général',
  STORE_MANAGER: 'Responsable de Magasin',
  CASHIER: 'Caissier',
  SERVER: 'Serveur',
  KITCHEN: 'Cuisine / KDS',
  DELIVERY: 'Service de Livraison (Externe)',
  LIVREUR: 'Livreur (Interne)',
  STORE_EMPLOYEE: 'Employé de Magasin'
};
