'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeLiveOrder } from '../lib/pos-helpers'

export type StockAlert = {
  name: string
  stockQuantity: number
}

export type RealtimeOrder = {
  id: string
  status: string
  tableId?: string | null
  total?: number
  estimatedPrepMinutes?: number | null
  estimatedReadyAt?: Date | string | null
  actualPrepMinutes?: number | null
  preparationStartedAt?: Date | string | null
  readyAt?: Date | string | null
  items?: Array<{
    id: string
    quantity: number
    price?: number
    options?: string | null
    product?: {
      name: string
    }
  }>
  payments?: Array<{
    id: string
    amount: number
    method?: string
    status: string
  }>
  table?: {
    number: number
  } | null
  [key: string]: unknown
}

type UsePOSRealtimeOptions = {
  initialOrders: RealtimeOrder[]
  storeId: string
  onReadyOrder?: (message: string) => void
}

export function usePOSRealtime({ initialOrders, storeId, onReadyOrder }: UsePOSRealtimeOptions) {
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [liveActiveOrders, setLiveActiveOrders] = useState<RealtimeOrder[]>(() => initialOrders.map(normalizeLiveOrder))
  const readyOrderIdsRef = useRef(
    new Set(
      initialOrders
        .map(normalizeLiveOrder)
        .filter((order) => order.status === 'PRET')
        .map((order) => order.id)
    )
  )

  // Fusionne une commande temps reel dans l'etat local et declenche une alerte
  // uniquement lorsqu'une commande passe a l'etat PRET.
  const mergeLiveOrder = useCallback((incomingOrder: RealtimeOrder) => {
    const normalizedOrder = normalizeLiveOrder(incomingOrder)
    let readyMessage: string | null = null

    setLiveActiveOrders((previousOrders) => {
      const existingOrder = previousOrders.find((order) => order.id === normalizedOrder.id)

      if (normalizedOrder.status === 'COMPLETED' || normalizedOrder.status === 'CANCELLED') {
        readyOrderIdsRef.current.delete(normalizedOrder.id)
        return previousOrders.filter((order) => order.id !== normalizedOrder.id)
      }

      if (normalizedOrder.status !== 'PRET') {
        readyOrderIdsRef.current.delete(normalizedOrder.id)
      }

      if (
        normalizedOrder.status === 'PRET' &&
        existingOrder?.status !== 'PRET' &&
        !readyOrderIdsRef.current.has(normalizedOrder.id)
      ) {
        readyOrderIdsRef.current.add(normalizedOrder.id)
        readyMessage = normalizedOrder.table?.number
          ? `La commande de la table ${normalizedOrder.table.number} est prete a etre servie.`
          : 'Une commande est prete a etre servie.'
      }

      if (existingOrder) {
        return previousOrders.map((order) => order.id === normalizedOrder.id ? normalizedOrder : order)
      }

      return [...previousOrders, normalizedOrder]
    })

    if (readyMessage) {
      onReadyOrder?.(readyMessage)
    }
  }, [onReadyOrder])

  useEffect(() => {
    if (!navigator.onLine) return

    const alertSource = new EventSource(`/api/stock/alerts?storeId=${storeId}`)
    const orderSource = new EventSource(`/api/kds/stream?storeId=${encodeURIComponent(storeId)}`)

    alertSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as StockAlert
      setStockAlerts((previousAlerts) => {
        if (previousAlerts.some((alert) => alert.name === data.name)) {
          return previousAlerts
        }

        return [data, ...previousAlerts].slice(0, 5)
      })
    }

    const handleOrderStreamEvent = (event: MessageEvent) => {
      try {
        const order = JSON.parse(event.data) as RealtimeOrder
        mergeLiveOrder(order)
      } catch (error) {
        console.error('Failed to parse order stream event:', error)
      }
    }

    orderSource.addEventListener('new-order', handleOrderStreamEvent as EventListener)
    orderSource.addEventListener('order-updated', handleOrderStreamEvent as EventListener)

    return () => {
      alertSource.close()
      orderSource.close()
    }
  }, [mergeLiveOrder, storeId])

  return {
    stockAlerts,
    setStockAlerts,
    liveActiveOrders,
    mergeLiveOrder,
  }
}
