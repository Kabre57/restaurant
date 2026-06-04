'use server'

import { redis } from '@/lib/redis'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

type POSOrderAlertPayload = {
  id: string
  storeId?: string
  table?: { number: number } | null
  total?: number
}

export async function publishStockAlert(storeId: string, product: { name: string, stockQuantity: number }) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  if (role !== "ADMIN") {
    assertSameStore(storeId, authStoreId)
  }

  try {
    await redis.publish(`store:${storeId}:stock-alert`, JSON.stringify(product))
  } catch (error) {
    console.error('Failed to publish stock alert:', error)
  }
}

export async function publishOrderEvent(eventName: 'new-order' | 'order-updated', order: { storeId?: string }) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  if (!order.storeId) return

  if (role !== "ADMIN") {
    assertSameStore(order.storeId, authStoreId)
  }

  try {
    await redis.publish(`store:${order.storeId}:orders:${eventName}`, JSON.stringify(order))
  } catch (error) {
    console.error(`Failed to publish ${eventName} to KDS:`, error)
  }
}

export async function publishPOSOrderAlert(type: 'ORDER_CREATED' | 'ORDER_READY', order: POSOrderAlertPayload) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  if (!order.storeId) return

  if (role !== "ADMIN") {
    assertSameStore(order.storeId, authStoreId)
  }

  try {
    await redis.publish(`store:${order.storeId}:pos-alerts`, JSON.stringify({
      type,
      storeId: order.storeId,
      orderId: order.id,
      tableNumber: order.table?.number,
      total: order.total,
      timestamp: new Date().toISOString(),
    }))
  } catch (error) {
    console.error(`Failed to publish POS ${type} alert:`, error)
  }
}
