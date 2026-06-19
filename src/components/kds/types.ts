'use client'

export type OrderStatus = 'EN_ATTENTE' | 'PREPARATION' | 'PRET' | 'COMPLETED' | 'CANCELLED'

export type StreamStatus = 'connecting' | 'connected' | 'reconnecting'

export type OrderItem = {
  id: string
  quantity: number
  options: string | null
  product: {
    name: string
    category: { name: string }
  }
}

export type KDSOrder = {
  id: string
  status: string
  storeId: string
  type: string
  createdAt: Date
  updatedAt?: Date | string | null
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

export type Order = Omit<KDSOrder, 'status'> & { status: OrderStatus }

export type ServerCallAlert = {
  tableId: string
  tableNumber?: number
  timestamp: string
}

export type KitchenAlert = {
  id: string
  message: string
  tone: 'info' | 'success' | 'warning'
}
