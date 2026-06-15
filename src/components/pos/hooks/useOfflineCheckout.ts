'use client'

import { addOrderToSyncQueue } from '@/lib/idb'

interface UseOfflineCheckoutOptions {
  refreshSyncQueueCount: () => Promise<unknown>
  updateSessionStats: (amount: number) => void
}

export function useOfflineCheckout({
  refreshSyncQueueCount,
  updateSessionStats
}: UseOfflineCheckoutOptions) {
  const saveOfflineOrder = async (orderData: any, netTotal: number) => {
    await addOrderToSyncQueue(orderData)
    await refreshSyncQueueCount()
    updateSessionStats(netTotal)
  }

  return {
    saveOfflineOrder
  }
}
