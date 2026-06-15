import { type OrderStatus } from '../KDSColumn'
import { type KDSOrder } from '../types'

/**
 * Normalise la chaîne de statut brute de la base de données vers le type OrderStatus du KDS
 * @param status - Le statut brut de la commande (ex: PRÉPARATION, PRÊT)
 * @returns Le statut normalisé utilisable par les colonnes du KDS
 */
export function normalizeStatus(status: string): OrderStatus {
  if (status === 'PRÉPARATION' || status === 'PREPARATION') return 'PREPARATION'
  if (status === 'PRÊT' || status === 'PRET') return 'PRET'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELLED') return 'CANCELLED'
  return 'EN_ATTENTE'
}

/**
 * Normalise l'objet commande brut pour s'assurer que les dates sont bien typées Date et le statut normalisé
 * @param order - La commande brute à normaliser
 * @returns La commande normalisée avec le type OrderStatus correct
 */
export function normalizeOrder(order: KDSOrder) {
  return {
    ...order,
    status: normalizeStatus(order.status),
    createdAt: new Date(order.createdAt)
  }
}
