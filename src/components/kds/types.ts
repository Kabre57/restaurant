/**
 * Statuts possibles de la connexion SSE / temps réel
 */
export type StreamStatus = 'connecting' | 'connected' | 'reconnecting'

/**
 * Représente un article individuel dans une commande du KDS
 */
export type OrderItem = {
  id: string
  quantity: number
  options: string | null
  product: { 
    name: string
    category: { name: string }
  }
}

/**
 * Format d'une commande reçue par le système KDS
 */
export type KDSOrder = {
  id: string
  status: string
  storeId: string
  type: string
  createdAt: Date
  estimatedPrepMinutes?: number | null
  estimatedReadyAt?: Date | string | null
  actualPrepMinutes?: number | null
  preparationStartedAt?: Date | string | null
  readyAt?: Date | string | null
  servedAt?: Date | string | null
  items: OrderItem[]
  table?: { number: number } | null
  customerNotes?: string | null
}

/**
 * Représente une alerte d'appel serveur à une table
 */
export type ServerCallAlert = {
  tableId: string
  tableNumber?: number
  timestamp: string
}

/**
 * Représente une alerte générale en cuisine
 */
export type KitchenAlert = {
  id: string
  message: string
  tone: 'info' | 'success' | 'warning'
}
