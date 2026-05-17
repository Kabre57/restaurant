'use server'

import { redis } from '@/lib/redis'

type POSOrderAlertPayload = {
  id: string
  storeId?: string
  table?: { number: number } | null
  total?: number
}

export async function publishStockAlert(storeId: string, product: { name: string, stockQuantity: number }) {
  try {
    await redis.publish(`store:${storeId}:stock-alert`, JSON.stringify(product))
  } catch (error) {
    console.error('Failed to publish stock alert:', error)
  }
}

export async function publishOrderEvent(eventName: 'new-order' | 'order-updated', order: { storeId?: string }) {
  if (!order.storeId) return

  try {
    await redis.publish(`store:${order.storeId}:orders:${eventName}`, JSON.stringify(order))
  } catch (error) {
    console.error(`Failed to publish ${eventName} to KDS:`, error)
  }
}

export async function publishPOSOrderAlert(type: 'ORDER_CREATED' | 'ORDER_READY', order: POSOrderAlertPayload) {
  if (!order.storeId) return

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
