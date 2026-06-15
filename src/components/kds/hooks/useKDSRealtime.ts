import { useState, useEffect, useRef } from 'react'
import { updateOrderStatus } from '@/app/actions/orders/orders'
import { playNotificationSound } from '@/lib/sound'
import type {
  OrderStatus,
  KDSOrder,
  Order,
  ServerCallAlert,
  KitchenAlert,
  StreamStatus
} from '../types'

function normalizeStatus(status: string): OrderStatus {
  if (status === 'PRÉPARATION' || status === 'PREPARATION') return 'PREPARATION'
  if (status === 'PRÊT' || status === 'PRET') return 'PRET'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELLED') return 'CANCELLED'
  return 'EN_ATTENTE'
}

function normalizeOrder(order: KDSOrder): Order {
  return {
    ...order,
    status: normalizeStatus(order.status),
    createdAt: new Date(order.createdAt)
  }
}

export function useKDSRealtime({
  initialOrders,
  storeId,
  prepZone,
  soundTone
}: {
  initialOrders: KDSOrder[]
  storeId: string
  prepZone: 'ALL' | 'CUISINE' | 'BAR'
  soundTone: 'info' | 'success' | 'warning'
}) {
  // 1. Initialisation avec Cache local en priorité (Offline first)
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kds_active_orders')
      if (saved) {
        try {
          return JSON.parse(saved).map((o: any) => ({ ...o, createdAt: new Date(o.createdAt) }))
        } catch (e) {
          console.error("Failed to parse cached active orders:", e)
        }
      }
    }
    return initialOrders.map(normalizeOrder)
  })

  const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting')
  const [retryDelay, setRetryDelay] = useState(1000)
  const [serverCalls, setServerCalls] = useState<ServerCallAlert[]>([])
  const [kitchenAlerts, setKitchenAlerts] = useState<KitchenAlert[]>([])
  
  // Historique local pour rappel de tickets
  const [completedHistory, setCompletedHistory] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kds_completed_history')
      if (saved) {
        try {
          return JSON.parse(saved).map((o: any) => ({ ...o, createdAt: new Date(o.createdAt) }))
        } catch (e) {
          console.error(e)
        }
      }
    }
    return []
  })

  // File d'attente des changements de statut en local (Offline queue)
  const [pendingActions, setPendingActions] = useState<{ orderId: string; status: OrderStatus }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kds_pending_actions')
      if (saved) {
        try { return JSON.parse(saved) } catch (e) { console.error("KDS Offline Sync Error:", e) }
      }
    }
    return []
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sauvegarder les commandes actives à chaque changement (LocalStorage Sync)
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('kds_active_orders', JSON.stringify(orders))
    }
  }, [orders])

  // Sauvegarder les actions en attente hors ligne
  useEffect(() => {
    localStorage.setItem('kds_pending_actions', JSON.stringify(pendingActions))
  }, [pendingActions])

  // Sauvegarder l'historique local
  useEffect(() => {
    localStorage.setItem('kds_completed_history', JSON.stringify(completedHistory))
  }, [completedHistory])

  // Synchronisation automatique des actions hors ligne à la reconnexion
  useEffect(() => {
    if (streamStatus === 'connected' && pendingActions.length > 0) {
      const syncActions = async () => {
        const toSync = [...pendingActions]
        const remaining = []
        for (const action of toSync) {
          try {
            const res = await updateOrderStatus(action.orderId, action.status, storeId)
            if (!res.success) {
              remaining.push(action)
            }
          } catch (e) {
            remaining.push(action)
          }
        }
        setPendingActions(remaining)
      }
      void syncActions()
    }
  }, [streamStatus, pendingActions, storeId])

  const pushKitchenAlert = (alert: KitchenAlert) => {
    setKitchenAlerts(prev => [alert, ...prev.filter(item => item.id !== alert.id)].slice(0, 4))
  }

  const addToHistory = (order: Order) => {
    setCompletedHistory(prev => {
      const exists = prev.some(o => o.id === order.id)
      if (exists) return prev
      const updated = [order, ...prev].slice(0, 15)
      return updated
    })
  }

  // Connexion SSE avec contrôle de cycle de vie et AbortController pour le Health Check
  useEffect(() => {
    let active = true
    const abortController = new AbortController()

    async function connectToStream(attempt = 0) {
      if (!active) return

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      eventSourceRef.current?.close()
      setStreamStatus(attempt === 0 ? 'connecting' : 'reconnecting')

      // Avant de tenter une reconnexion, vérifier la santé du serveur via fetch + AbortController
      if (attempt > 0) {
        try {
          const isHealthy = await Promise.race([
            fetch('/api/health', { signal: abortController.signal }).then(r => r.ok),
            new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ])
          if (!isHealthy && active) {
            // Serveur indisponible, repousser la tentative
            const delay = Math.min(30000, 1000 * 2 ** attempt)
            setRetryDelay(delay)
            reconnectTimerRef.current = setTimeout(() => connectToStream(attempt + 1), delay)
            return
          }
        } catch {
          if (active) {
            const delay = Math.min(30000, 1000 * 2 ** attempt)
            setRetryDelay(delay)
            reconnectTimerRef.current = setTimeout(() => connectToStream(attempt + 1), delay)
            return
          }
        }
      }

      if (!active) return

      const eventSource = new EventSource(`/api/kds/stream?storeId=${encodeURIComponent(storeId)}&station=${prepZone}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        if (!active) return
        setStreamStatus('connected')
        setRetryDelay(1000)
      }

      eventSource.addEventListener('new-order', (event) => {
        if (!active) return
        const newOrder = normalizeOrder(JSON.parse(event.data))
        if (newOrder.storeId !== storeId) return
        pushKitchenAlert({
          id: `new-${newOrder.id}`,
          message: newOrder.table?.number
            ? `Nouvelle commande table ${newOrder.table.number}`
            : 'Nouvelle commande',
          tone: 'info',
        })
        playNotificationSound(soundTone)

        setOrders(prev => {
          const exists = prev.some(order => order.id === newOrder.id)
          const next = exists ? prev.map(order => order.id === newOrder.id ? newOrder : order) : [...prev, newOrder]
          // Stocker immédiatement dans localStorage au chargement SSE
          localStorage.setItem('kds_active_orders', JSON.stringify(next))
          return next
        })
      })

      eventSource.addEventListener('order-updated', (event) => {
        if (!active) return
        const updatedOrder = normalizeOrder(JSON.parse(event.data))
        if (updatedOrder.storeId !== storeId) return
        
        if (updatedOrder.servedAt) {
          setOrders(prev => {
            const match = prev.find(o => o.id === updatedOrder.id)
            if (match) addToHistory(match)
            const next = prev.filter(o => o.id !== updatedOrder.id)
            localStorage.setItem('kds_active_orders', JSON.stringify(next))
            return next
          })
          return
        }

        if (updatedOrder.status === 'PRET') {
          pushKitchenAlert({
            id: `ready-${updatedOrder.id}`,
            message: updatedOrder.table?.number
              ? `Commande prete table ${updatedOrder.table.number}`
              : 'Commande prete',
            tone: 'success',
          })
          playNotificationSound('success')
        }

        setOrders(prev => {
          let next
          if (updatedOrder.status === 'COMPLETED' || updatedOrder.status === 'CANCELLED') {
            const match = prev.find(o => o.id === updatedOrder.id)
            if (match) addToHistory(match)
            next = prev.filter(o => o.id !== updatedOrder.id)
          } else {
            const exists = prev.find(o => o.id === updatedOrder.id)
            next = exists ? prev.map(o => o.id === updatedOrder.id ? updatedOrder : o) : [...prev, updatedOrder]
          }
          localStorage.setItem('kds_active_orders', JSON.stringify(next))
          return next
        })
      })

      eventSource.addEventListener('heartbeat', () => {
        if (!active) return
        setStreamStatus('connected')
      })

      eventSource.addEventListener('server-call', (event) => {
        if (!active) return
        const call = JSON.parse(event.data) as ServerCallAlert
        setServerCalls(prev => [call, ...prev.filter(item => item.tableId !== call.tableId)].slice(0, 4))
        pushKitchenAlert({
          id: `call-${call.tableId}`,
          message: call.tableNumber ? `Appel serveur table ${call.tableNumber}` : 'Appel serveur',
          tone: 'warning',
        })
        playNotificationSound('warning')
      })

      eventSource.onerror = () => {
        eventSource.close()
        if (!active) return

        const delay = Math.min(30000, 1000 * 2 ** attempt)
        setRetryDelay(delay)
        setStreamStatus('reconnecting')
        reconnectTimerRef.current = setTimeout(() => connectToStream(attempt + 1), delay)
      }
    }

    connectToStream()

    return () => {
      active = false
      abortController.abort()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      eventSourceRef.current?.close()
    }
  }, [storeId, prepZone, soundTone])

  // Actions de mise à jour de statut (avec support hors ligne optimiste)
  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    if (currentStatus === 'PRET') return

    let nextStatus: OrderStatus = 'PREPARATION'
    if (currentStatus === 'PREPARATION') {
      nextStatus = 'PRET'
      const orderToArchive = orders.find(o => o.id === orderId)
      if (orderToArchive) addToHistory({ ...orderToArchive, status: 'PRET' })
    }

    // Mise à jour optimiste
    setOrders(prev => {
      const next = prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o)
      localStorage.setItem('kds_active_orders', JSON.stringify(next))
      return next
    })

    try {
      const res = await updateOrderStatus(orderId, nextStatus, storeId)
      if (!res.success) {
        setPendingActions(prev => [...prev.filter(a => a.orderId !== orderId), { orderId, status: nextStatus }])
      }
    } catch (error) {
      setPendingActions(prev => [...prev.filter(a => a.orderId !== orderId), { orderId, status: nextStatus }])
    }
  }

  const handleMoveStatusBackward = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'EN_ATTENTE'
    if (currentStatus === 'PRET') {
      nextStatus = 'PREPARATION'
    }

    setOrders(prev => {
      const next = prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o)
      localStorage.setItem('kds_active_orders', JSON.stringify(next))
      return next
    })

    try {
      const res = await updateOrderStatus(orderId, nextStatus, storeId)
      if (!res.success) {
        setPendingActions(prev => [...prev.filter(a => a.orderId !== orderId), { orderId, status: nextStatus }])
      }
    } catch (error) {
      setPendingActions(prev => [...prev.filter(a => a.orderId !== orderId), { orderId, status: nextStatus }])
    }
  }

  const handleRecallOrder = async (order: Order) => {
    const nextStatus: OrderStatus = 'PRET'
    
    // Retirer de l'historique
    setCompletedHistory(prev => {
      const next = prev.filter(o => o.id !== order.id)
      localStorage.setItem('kds_completed_history', JSON.stringify(next))
      return next
    })

    // Remettre dans la liste active
    setOrders(prev => {
      const exists = prev.some(o => o.id === order.id)
      const next = exists ? prev.map(o => o.id === order.id ? { ...order, status: nextStatus } : o) : [...prev, { ...order, status: nextStatus }]
      localStorage.setItem('kds_active_orders', JSON.stringify(next))
      return next
    })

    try {
      const res = await updateOrderStatus(order.id, nextStatus, storeId)
      if (!res.success) {
        setPendingActions(prev => [...prev.filter(a => a.orderId !== order.id), { orderId: order.id, status: nextStatus }])
      }
    } catch (error) {
      setPendingActions(prev => [...prev.filter(a => a.orderId !== order.id), { orderId: order.id, status: nextStatus }])
    }
  }

  return {
    orders,
    setOrders,
    streamStatus,
    retryDelay,
    serverCalls,
    setServerCalls,
    kitchenAlerts,
    setKitchenAlerts,
    pendingActions,
    completedHistory,
    handleUpdateStatus,
    handleMoveStatusBackward,
    handleRecallOrder
  }
}
