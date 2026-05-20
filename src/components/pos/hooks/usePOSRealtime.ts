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
  servedAt?: Date | string | null
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
  onServerCall?: (message: string) => void
}

type POSAlertEvent = {
  type?: 'CALL_SERVER' | 'TABLE_RESERVED' | 'ORDER_CREATED' | 'ORDER_READY'
  tableNumber?: number
  customerName?: string
  total?: number
}

function buildPOSAlertMessage(alert: POSAlertEvent) {
  if (alert.type === 'TABLE_RESERVED') {
    return alert.tableNumber
      ? `La table ${alert.tableNumber} vient d'etre reservee${alert.customerName ? ` par ${alert.customerName}` : ''}.`
      : 'Une table vient d’etre reservee.'
  }

  if (alert.type === 'ORDER_CREATED') {
    return alert.tableNumber
      ? `Nouvelle commande passee depuis la table ${alert.tableNumber}.`
      : 'Nouvelle commande passee.'
  }

  if (alert.type === 'ORDER_READY') {
    return alert.tableNumber
      ? `La commande de la table ${alert.tableNumber} est prete.`
      : 'Une commande est prete.'
  }

  return alert.tableNumber
    ? `La table ${alert.tableNumber} appelle un serveur.`
    : 'Un client appelle un serveur.'
}

export function usePOSRealtime({ initialOrders, storeId, onReadyOrder, onServerCall }: UsePOSRealtimeOptions) {
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
    const posAlertSource = new EventSource(`/api/pos/alerts?storeId=${encodeURIComponent(storeId)}`)

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
    posAlertSource.addEventListener('server-call', (event) => {
      try {
        const alert = JSON.parse(event.data) as POSAlertEvent
        onServerCall?.(buildPOSAlertMessage(alert))
      } catch (error) {
        console.error('Failed to parse POS alert event:', error)
      }
    })

    return () => {
      alertSource.close()
      orderSource.close()
      posAlertSource.close()
    }
  }, [mergeLiveOrder, onServerCall, storeId])

  return {
    stockAlerts,
    setStockAlerts,
    liveActiveOrders,
    mergeLiveOrder,
  }
}
