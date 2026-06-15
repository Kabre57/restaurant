import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const kitchenPermissions: PermissionItem[] = [
  { key: 'KDS_ACCESS', name: 'Kitchen Display System (KDS)', desc: 'Consulter et valider les commandes en préparation en cuisine.', module: 'cuisine_kds', category: 'Préparation' },
  { key: 'kds.orders_view', name: 'Commandes en Cuisine', desc: 'Visualiser les tickets de cuisine actifs.', module: 'cuisine_kds', category: 'Préparation' },
  { key: 'kds.status_update', name: 'Valider préparation', desc: 'Marquer les plats comme "Prêt".', module: 'cuisine_kds', category: 'Préparation' },
  { key: 'kds.alert_send', name: 'Envoyer alertes', desc: 'Notifier les serveurs par voyant ou signal sonore.', module: 'cuisine_kds', category: 'Préparation' },
  { key: 'kds.history', name: 'Historique Cuisine', desc: 'Consulter le journal de traitement des plats.', module: 'cuisine_kds', category: 'Préparation' }
]

export const kitchenDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    KDS_ACCESS: true,
    'kds.orders_view': true,
    'kds.status_update': true,
    'kds.alert_send': true,
    'kds.history': true
  },
  MANAGER: {
    KDS_ACCESS: true,
    'kds.orders_view': true,
    'kds.status_update': true,
    'kds.alert_send': true,
    'kds.history': true
  },
  CASHIER: {
    KDS_ACCESS: false,
    'kds.orders_view': false,
    'kds.status_update': false,
    'kds.alert_send': false,
    'kds.history': false
  },
  SERVER: {
    KDS_ACCESS: false,
    'kds.orders_view': false,
    'kds.status_update': false,
    'kds.alert_send': false,
    'kds.history': false
  },
  KITCHEN: {
    KDS_ACCESS: true,
    'kds.orders_view': true,
    'kds.status_update': true,
    'kds.alert_send': true,
    'kds.history': true
  },
  DELIVERY: {
    KDS_ACCESS: false,
    'kds.orders_view': false,
    'kds.status_update': false,
    'kds.alert_send': false,
    'kds.history': false
  },
  LIVREUR: {
    KDS_ACCESS: false,
    'kds.orders_view': false,
    'kds.status_update': false,
    'kds.alert_send': false,
    'kds.history': false
  },
  ADMIN: {
    KDS_ACCESS: true,
    'kds.orders_view': true,
    'kds.status_update': true,
    'kds.alert_send': true,
    'kds.history': true
  },
  SUPER_ADMIN: {
    KDS_ACCESS: true,
    'kds.orders_view': true,
    'kds.status_update': true,
    'kds.alert_send': true,
    'kds.history': true
  },
  STORE_MANAGER: {
    KDS_ACCESS: true,
    'kds.orders_view': true,
    'kds.status_update': true,
    'kds.alert_send': true,
    'kds.history': true
  },
  STORE_EMPLOYEE: {
    KDS_ACCESS: true,
    'kds.orders_view': true,
    'kds.status_update': true,
    'kds.alert_send': false,
    'kds.history': true
  }
}
