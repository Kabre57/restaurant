import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const loyaltyPermissions: PermissionItem[] = [
  { key: 'loyalty.customers_view', name: 'Voir clients', desc: 'Rechercher un client dans le fichier CRM.', module: 'fidelisation_clients', category: 'Fidélisation' },
  { key: 'loyalty.customers_edit', name: 'Modifier clients', desc: 'Changer les adresses, e-mails ou notes clients.', module: 'fidelisation_clients', category: 'Fidélisation' },
  { key: 'loyalty.points_add', name: 'Créditer points', desc: 'Ajouter manuellement des points de fidélité.', module: 'fidelisation_clients', category: 'Actions' },
  { key: 'loyalty.points_reset', name: 'Remise à zéro', desc: 'Remise à zéro des points fidélité.', module: 'fidelisation_clients', category: 'Actions' },
  { key: 'loyalty.rewards_manage', name: 'Gérer récompenses', desc: 'Créer les paliers de cadeaux fidélité.', module: 'fidelisation_clients', category: 'Fidélisation' },
  { key: 'loyalty.promotions_manage', name: 'Gérer promotions', desc: 'Créer des codes de réductions temporaires.', module: 'fidelisation_clients', category: 'Fidélisation' },
  { key: 'loyalty.export', name: 'Exporter CRM', desc: 'Télécharger le fichier de contacts clients.', module: 'fidelisation_clients', category: 'Actions' }
]

export const loyaltyDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': true,
    'loyalty.points_add': true,
    'loyalty.points_reset': true,
    'loyalty.rewards_manage': true,
    'loyalty.promotions_manage': true,
    'loyalty.export': true
  },
  MANAGER: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': true,
    'loyalty.points_add': true,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': true,
    'loyalty.promotions_manage': true,
    'loyalty.export': true
  },
  CASHIER: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': true,
    'loyalty.points_add': false,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': false,
    'loyalty.promotions_manage': false,
    'loyalty.export': false
  },
  SERVER: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': false,
    'loyalty.points_add': false,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': false,
    'loyalty.promotions_manage': false,
    'loyalty.export': false
  },
  KITCHEN: {
    'loyalty.customers_view': false,
    'loyalty.customers_edit': false,
    'loyalty.points_add': false,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': false,
    'loyalty.promotions_manage': false,
    'loyalty.export': false
  },
  DELIVERY: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': false,
    'loyalty.points_add': false,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': false,
    'loyalty.promotions_manage': false,
    'loyalty.export': false
  },
  LIVREUR: {
    'loyalty.customers_view': false,
    'loyalty.customers_edit': false,
    'loyalty.points_add': false,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': false,
    'loyalty.promotions_manage': false,
    'loyalty.export': false
  },
  ADMIN: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': true,
    'loyalty.points_add': true,
    'loyalty.points_reset': true,
    'loyalty.rewards_manage': true,
    'loyalty.promotions_manage': true,
    'loyalty.export': true
  },
  SUPER_ADMIN: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': true,
    'loyalty.points_add': true,
    'loyalty.points_reset': true,
    'loyalty.rewards_manage': true,
    'loyalty.promotions_manage': true,
    'loyalty.export': true
  },
  STORE_MANAGER: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': true,
    'loyalty.points_add': true,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': true,
    'loyalty.promotions_manage': true,
    'loyalty.export': true
  },
  STORE_EMPLOYEE: {
    'loyalty.customers_view': true,
    'loyalty.customers_edit': false,
    'loyalty.points_add': false,
    'loyalty.points_reset': false,
    'loyalty.rewards_manage': false,
    'loyalty.promotions_manage': false,
    'loyalty.export': false
  }
}
