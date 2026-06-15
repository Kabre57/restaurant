import { publishOrderEvent, publishPOSOrderAlert } from '@/app/actions/orders/orderNotifications'
import { redis, REDIS_KEYS } from '@/lib/redis'
import { AnalyticsService } from '@/services/analytics.service'

/**
 * Service pour gérer l'envoi des notifications en temps réel (SSE/KDS)
 * et l'invalidation des caches associés aux commandes.
 */
export async function notifyOrderCreated(order: { id: string; storeId: string; status: string; total: number }): Promise<void> {
  await publishOrderEvent('new-order', order)
  await publishPOSOrderAlert('ORDER_CREATED', order)
  await redis.del(REDIS_KEYS.stats(order.storeId))
  await AnalyticsService.invalidateStoreAnalytics(order.storeId)
}

export async function notifyOrderUpdated(order: { id: string; storeId: string; status: string; total: number }): Promise<void> {
  await publishOrderEvent('order-updated', order)
  await redis.del(REDIS_KEYS.stats(order.storeId))
}

export async function notifyOrderReady(order: { id: string; storeId: string; status: string; total: number }): Promise<void> {
  await publishOrderEvent('order-updated', order)
  await publishPOSOrderAlert('ORDER_READY', order)
  await redis.del(REDIS_KEYS.stats(order.storeId))
  await AnalyticsService.invalidateStoreAnalytics(order.storeId)
}
