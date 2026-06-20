'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { syncOrdersBatch } from '@/app/actions/orders/orders'
import {
  clearSyncQueueItem,
  getCategoriesFromIDB,
  getProductsFromIDB,
  getSyncQueue,
  markSyncQueueItemFailed,
  purgeStaleSyncQueue,
  saveCategoriesToIDB,
  saveProductsToIDB,
} from '@/lib/idb'
import type { CachedCategory, CachedProduct, QueuedOrder } from '@/lib/idb'
import {
  SYNC_ORDER_SCHEMA_VERSION,
  syncBatchResponseSchema,
  syncResultIsSuccessful,
  type SyncOrderInput,
  type SyncOrderResult,
} from '@/lib/offline-sync'
import { createClientRequestId } from '../lib/pos-helpers'

type UsePOSSyncStateOptions = {
  cashierId: string
  initialCategories: CachedCategory[]
  initialProducts: CachedProduct[]
  onHydrateCategories: (categories: CachedCategory[]) => void
  onHydrateProducts: (products: CachedProduct[]) => void
}

export function usePOSSyncState({
  cashierId,
  initialCategories,
  initialProducts,
  onHydrateCategories,
  onHydrateProducts,
}: UsePOSSyncStateOptions) {
  const syncInFlightRef = useRef(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncQueueCount, setSyncQueueCount] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)

  const refreshSyncQueueCount = useCallback(async () => {
    await purgeStaleSyncQueue()
    const queue = await getSyncQueue()
    setSyncQueueCount(queue.length)
    return queue
  }, [])

  const loadOfflineData = useCallback(async () => {
    if (initialCategories.length > 0) {
      await saveCategoriesToIDB(initialCategories)
      await saveProductsToIDB(initialProducts)
    } else {
      const cachedCategories = await getCategoriesFromIDB()
      const cachedProducts = await getProductsFromIDB()

      if (cachedCategories.length > 0) onHydrateCategories(cachedCategories)
      if (cachedProducts.length > 0) onHydrateProducts(cachedProducts)
    }

    await refreshSyncQueueCount()
  }, [
    initialCategories,
    initialProducts,
    onHydrateCategories,
    onHydrateProducts,
    refreshSyncQueueCount,
  ])

  const normalizeQueuedOrder = useCallback((pendingOrder: QueuedOrder): SyncOrderInput => {
    return {
      ...pendingOrder,
      clientRequestId:
        pendingOrder.clientRequestId ||
        createClientRequestId(pendingOrder.storeId, pendingOrder.cashierId ?? cashierId),
      cashierId: pendingOrder.cashierId ?? cashierId,
      paymentMode: pendingOrder.paymentMode || 'ESPECES',
      paymentStatus: pendingOrder.paymentStatus ?? 'PAID',
      schemaVersion: pendingOrder.schemaVersion ?? SYNC_ORDER_SCHEMA_VERSION,
      queuedAt:
        pendingOrder.queuedAt ||
        new Date(pendingOrder.createdAt ?? Date.now()).toISOString(),
      localStatus: pendingOrder.localStatus ?? 'PENDING_SYNC',
    }
  }, [cashierId])

  const syncOrdersViaEndpoint = useCallback(async (batch: SyncOrderInput[]) => {
    const response = await fetch('/api/orders/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })

    if (!response.ok) {
      throw new Error(`Endpoint sync indisponible (${response.status})`)
    }

    const payload: unknown = await response.json()
    return syncBatchResponseSchema.parse(payload).results
  }, [])

  const syncOrdersWithFallback = useCallback(async (batch: SyncOrderInput[]): Promise<SyncOrderResult[]> => {
    try {
      return await syncOrdersViaEndpoint(batch)
    } catch (endpointError) {
      console.warn('Endpoint /api/orders/sync indisponible, fallback Server Action:', endpointError)
      return syncOrdersBatch(batch)
    }
  }, [syncOrdersViaEndpoint])

  // Garde la caisse coherente entre le cache local, le reseau et la file offline.
  const syncPendingOrders = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (syncInFlightRef.current) return

    syncInFlightRef.current = true
    setIsSyncing(true)

    try {
      const queue = (await refreshSyncQueueCount())
        .filter((pendingOrder) => pendingOrder.localStatus !== 'SYNCED')
        .map(normalizeQueuedOrder)

      for (let index = 0; index < queue.length; index += 5) {
        const batch = queue.slice(index, index + 5)
        const results = await syncOrdersWithFallback(batch)

        for (const [resultIndex, result] of results.entries()) {
          const pendingOrder = batch[resultIndex]

          if (!syncResultIsSuccessful(result.status)) {
            console.error('Queued order was not synced:', result.error)
            if (typeof pendingOrder.id === 'number') {
              await markSyncQueueItemFailed(
                pendingOrder.id,
                result.error || result.reason || 'Synchronisation impossible'
              )
            }
            continue
          }

          if (typeof pendingOrder.id === 'number') {
            await clearSyncQueueItem(pendingOrder.id)
          }
        }

        await refreshSyncQueueCount()
      }
    } catch (error) {
      console.error('Offline sync failed:', error)
    } finally {
      syncInFlightRef.current = false
      setIsSyncing(false)
    }
  }, [normalizeQueuedOrder, refreshSyncQueueCount, syncOrdersWithFallback])

  const updateSessionStats = useCallback((amount: number) => {
    setSessionTotal((currentTotal) => {
      const nextTotal = currentTotal + amount
      window.localStorage.setItem(`cashier_total_${cashierId}`, nextTotal.toString())
      return nextTotal
    })
  }, [cashierId])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const savedTotal = window.localStorage.getItem(`cashier_total_${cashierId}`)
      if (savedTotal) setSessionTotal(parseFloat(savedTotal))
    })

    const handleConnectionChange = () => {
      const online = navigator.onLine
      setIsOnline(online)
      if (online) void syncPendingOrders()
    }

    window.addEventListener('online', handleConnectionChange)
    window.addEventListener('offline', handleConnectionChange)

    const statusTimerId = window.setTimeout(handleConnectionChange, 0)
    const cacheTimerId = window.setTimeout(() => {
      void loadOfflineData().then(() => {
        if (navigator.onLine) void syncPendingOrders()
      })
    }, 0)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(statusTimerId)
      window.clearTimeout(cacheTimerId)
      window.removeEventListener('online', handleConnectionChange)
      window.removeEventListener('offline', handleConnectionChange)
    }
  }, [cashierId, loadOfflineData, syncPendingOrders])

  return {
    isOnline,
    isSyncing,
    syncQueueCount,
    sessionTotal,
    refreshSyncQueueCount,
    syncPendingOrders,
    updateSessionStats,
  }
}
