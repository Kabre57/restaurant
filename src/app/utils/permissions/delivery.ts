import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const deliveryPermissions: PermissionItem[] = [
  { key: 'delivery.orders_view', name: 'Voir livraisons', desc: 'Lister les commandes affectées à la livraison à domicile.', module: 'livraison', category: 'Livraison' },
  { key: 'delivery.driver_assign', name: 'Assigner livreur', desc: 'Attribuer manuellement une course à un livreur disponible.', module: 'livraison', category: 'Actions' },
  { key: 'delivery.gps_tracking', name: 'Suivi GPS', desc: 'Visualiser la position du coursier sur la carte.', module: 'livraison', category: 'Lecture' },
  { key: 'delivery.pwa_access', name: 'Accès livreur PWA', desc: "Se connecter à l'espace mobile de livraison.", module: 'livraison', category: 'Système' },
  { key: 'delivery.settings', name: 'Frais de livraison', desc: 'Définir les frais de port et périmètres de livraison.', module: 'livraison', category: 'Configuration' },
  { key: 'delivery.driver_payout', name: 'Commissions coursiers', desc: 'Calculer les indemnités de trajet des livreurs.', module: 'livraison', category: 'Comptabilité' },
  { key: 'delivery.status_override', name: 'Forcer statuts', desc: "Modifier manuellement le statut de livraison d'une commande.", module: 'livraison', category: 'Actions' },
  { key: 'delivery.route_optimization', name: 'Optimiser trajets', desc: "Calculer l'ordre de passage optimal des adresses.", module: 'livraison', category: 'Actions' }
]

export const deliveryDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    'delivery.orders_view': true,
    'delivery.driver_assign': true,
    'delivery.gps_tracking': true,
    'delivery.pwa_access': true,
    'delivery.settings': true,
    'delivery.driver_payout': true,
    'delivery.status_override': true,
    'delivery.route_optimization': true
  },
  MANAGER: {
    'delivery.orders_view': true,
    'delivery.driver_assign': true,
    'delivery.gps_tracking': true,
    'delivery.pwa_access': true,
    'delivery.settings': false,
    'delivery.driver_payout': true,
    'delivery.status_override': true,
    'delivery.route_optimization': true
  },
  CASHIER: {
    'delivery.orders_view': true,
    'delivery.driver_assign': false,
    'delivery.gps_tracking': false,
    'delivery.pwa_access': false,
    'delivery.settings': false,
    'delivery.driver_payout': false,
    'delivery.status_override': false,
    'delivery.route_optimization': false
  },
  SERVER: {
    'delivery.orders_view': false,
    'delivery.driver_assign': false,
    'delivery.gps_tracking': false,
    'delivery.pwa_access': false,
    'delivery.settings': false,
    'delivery.driver_payout': false,
    'delivery.status_override': false,
    'delivery.route_optimization': false
  },
  KITCHEN: {
    'delivery.orders_view': false,
    'delivery.driver_assign': false,
    'delivery.gps_tracking': false,
    'delivery.pwa_access': false,
    'delivery.settings': false,
    'delivery.driver_payout': false,
    'delivery.status_override': false,
    'delivery.route_optimization': false
  },
  DELIVERY: {
    'delivery.orders_view': true,
    'delivery.driver_assign': true,
    'delivery.gps_tracking': true,
    'delivery.pwa_access': false,
    'delivery.settings': false,
    'delivery.driver_payout': false,
    'delivery.status_override': true,
    'delivery.route_optimization': true
  },
  LIVREUR: {
    'delivery.orders_view': true,
    'delivery.driver_assign': false,
    'delivery.gps_tracking': false,
    'delivery.pwa_access': true,
    'delivery.settings': false,
    'delivery.driver_payout': false,
    'delivery.status_override': false,
    'delivery.route_optimization': false
  },
  ADMIN: {
    'delivery.orders_view': true,
    'delivery.driver_assign': true,
    'delivery.gps_tracking': true,
    'delivery.pwa_access': true,
    'delivery.settings': true,
    'delivery.driver_payout': true,
    'delivery.status_override': true,
    'delivery.route_optimization': true
  },
  SUPER_ADMIN: {
    'delivery.orders_view': true,
    'delivery.driver_assign': true,
    'delivery.gps_tracking': true,
    'delivery.pwa_access': true,
    'delivery.settings': true,
    'delivery.driver_payout': true,
    'delivery.status_override': true,
    'delivery.route_optimization': true
  },
  STORE_MANAGER: {
    'delivery.orders_view': true,
    'delivery.driver_assign': true,
    'delivery.gps_tracking': true,
    'delivery.pwa_access': true,
    'delivery.settings': false,
    'delivery.driver_payout': true,
    'delivery.status_override': true,
    'delivery.route_optimization': true
  },
  STORE_EMPLOYEE: {
    'delivery.orders_view': false,
    'delivery.driver_assign': false,
    'delivery.gps_tracking': false,
    'delivery.pwa_access': false,
    'delivery.settings': false,
    'delivery.driver_payout': false,
    'delivery.status_override': false,
    'delivery.route_optimization': false
  }
}
