import { Role } from '@prisma/client'

export const SYSTEM_ROLES: Role[] = [
  'RESTAURATEUR',
  'MANAGER',
  'CASHIER',
  'SERVER',
  'KITCHEN',
  'DELIVERY',
  'LIVREUR',
  'ADMIN',
  'SUPER_ADMIN',
  'STORE_MANAGER',
  'STORE_EMPLOYEE'
]

export const ROLE_LABELS: Record<Role, string> = {
  RESTAURATEUR: 'Propriétaire',
  MANAGER: 'Gérant',
  CASHIER: 'Caissier(ère)',
  SERVER: 'Serveur(se)',
  KITCHEN: 'Cuisinier(ère)',
  DELIVERY: 'Gest. Livraison',
  LIVREUR: 'Livreur (PWA)',
  ADMIN: 'Admin Plateforme',
  SUPER_ADMIN: 'Super Admin',
  STORE_MANAGER: 'Dir. Établissement',
  STORE_EMPLOYEE: 'Employé Établissement'
}

export interface StaffMember {
  id: string
  name: string
  role: Role
}

export interface CustomPermission {
  id: string
  permissionKey: string
  name: string
  desc: string
  module: string
}
