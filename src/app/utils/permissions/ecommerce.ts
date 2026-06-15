import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const ecommercePermissions: PermissionItem[] = [
  { key: 'ecommerce.catalog_sync', name: 'Synchroniser Menu', desc: 'Publier les articles POS sur le site web public.', module: 'ecommerce_web', category: 'Web' },
  { key: 'ecommerce.orders_view', name: 'Voir commandes web', desc: 'Consulter le panier en ligne et les commandes reçues.', module: 'ecommerce_web', category: 'Web' },
  { key: 'ecommerce.orders_accept', name: 'Accepter commandes', desc: 'Envoyer les paniers en ligne vers le flux POS/KDS.', module: 'ecommerce_web', category: 'Actions' },
  { key: 'ecommerce.settings', name: 'Passerelles de paiement', desc: 'Configurer les comptes Stripe et Mobile Money.', module: 'ecommerce_web', category: 'Configuration' },
  { key: 'ecommerce.delivery_fees', name: 'Frais de livraison web', desc: 'Configurer les grilles de prix e-commerce.', module: 'ecommerce_web', category: 'Configuration' },
  { key: 'ecommerce.analytics', name: 'KPIs E-commerce', desc: "Suivre le taux de rebond et chiffre d'affaires en ligne.", module: 'ecommerce_web', category: 'Lecture' }
]

export const ecommerceDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    'ecommerce.catalog_sync': true,
    'ecommerce.orders_view': true,
    'ecommerce.orders_accept': true,
    'ecommerce.settings': true,
    'ecommerce.delivery_fees': true,
    'ecommerce.analytics': true
  },
  MANAGER: {
    'ecommerce.catalog_sync': true,
    'ecommerce.orders_view': true,
    'ecommerce.orders_accept': true,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': true
  },
  CASHIER: {
    'ecommerce.catalog_sync': false,
    'ecommerce.orders_view': false,
    'ecommerce.orders_accept': false,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': false
  },
  SERVER: {
    'ecommerce.catalog_sync': false,
    'ecommerce.orders_view': false,
    'ecommerce.orders_accept': false,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': false
  },
  KITCHEN: {
    'ecommerce.catalog_sync': false,
    'ecommerce.orders_view': false,
    'ecommerce.orders_accept': false,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': false
  },
  DELIVERY: {
    'ecommerce.catalog_sync': false,
    'ecommerce.orders_view': true,
    'ecommerce.orders_accept': false,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': false
  },
  LIVREUR: {
    'ecommerce.catalog_sync': false,
    'ecommerce.orders_view': false,
    'ecommerce.orders_accept': false,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': false
  },
  ADMIN: {
    'ecommerce.catalog_sync': true,
    'ecommerce.orders_view': true,
    'ecommerce.orders_accept': true,
    'ecommerce.settings': true,
    'ecommerce.delivery_fees': true,
    'ecommerce.analytics': true
  },
  SUPER_ADMIN: {
    'ecommerce.catalog_sync': true,
    'ecommerce.orders_view': true,
    'ecommerce.orders_accept': true,
    'ecommerce.settings': true,
    'ecommerce.delivery_fees': true,
    'ecommerce.analytics': true
  },
  STORE_MANAGER: {
    'ecommerce.catalog_sync': true,
    'ecommerce.orders_view': true,
    'ecommerce.orders_accept': true,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': true
  },
  STORE_EMPLOYEE: {
    'ecommerce.catalog_sync': false,
    'ecommerce.orders_view': false,
    'ecommerce.orders_accept': false,
    'ecommerce.settings': false,
    'ecommerce.delivery_fees': false,
    'ecommerce.analytics': false
  }
}
