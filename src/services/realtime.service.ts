import { redisPub } from '@/lib/redis'
import { logger } from '@/lib/logger'

export class RealtimeService {
  static async publishBookingEvent(
    storeId: string,
    event: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED',
    data: unknown
  ) {
    const channel = `booking-events:${storeId}`
    const payload = { event, data }
    try {
      await redisPub.publish(channel, JSON.stringify(payload))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error(`[RealtimeService] Erreur de publication réservation sur ${channel}:`, msg)
    }
  }

  static async publishTableEvent(
    storeId: string,
    event: 'TABLE_UPDATED',
    data: unknown
  ) {
    const channel = `table-updated:${storeId}`
    const payload = { event, data }
    try {
      await redisPub.publish(channel, JSON.stringify(payload))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error(`[RealtimeService] Erreur de publication table sur ${channel}:`, msg)
    }
  }
}
