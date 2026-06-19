import type { OrderStatus } from '../types'

export type PendingKDSAction = {
  orderId: string
  status: OrderStatus
  updatedAt: string
}

export type LwwOrderSnapshot = {
  id: string
  status: OrderStatus
  updatedAt?: Date | string | null
}

export type StatusConflictAudit = {
  type: 'STATUS_CONFLICT'
  orderId: string
  localStatus: OrderStatus
  serverStatus: OrderStatus
  localUpdatedAt: string
  serverUpdatedAt?: string
}

export function createPendingKDSAction(orderId: string, status: OrderStatus, updatedAt = new Date().toISOString()): PendingKDSAction {
  return { orderId, status, updatedAt }
}

export function timestampMs(value?: Date | string | null) {
  if (!value) return 0
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  return Number.isNaN(time) ? 0 : time
}

export function findPendingAction(orderId: string, actions: PendingKDSAction[]) {
  return actions.find((action) => action.orderId === orderId)
}

/**
 * Règle LWW: l'état qui possède l'horodatage le plus récent gagne.
 */
export function shouldApplyServerOrder(order: LwwOrderSnapshot, actions: PendingKDSAction[]) {
  const pending = findPendingAction(order.id, actions)
  if (!pending) return true
  return timestampMs(order.updatedAt) >= timestampMs(pending.updatedAt)
}

export function buildStatusConflictAudit(
  order: LwwOrderSnapshot,
  actions: PendingKDSAction[]
): StatusConflictAudit | null {
  const pending = findPendingAction(order.id, actions)
  if (!pending || pending.status === order.status) return null
  if (timestampMs(order.updatedAt) < timestampMs(pending.updatedAt)) return null

  return {
    type: 'STATUS_CONFLICT',
    orderId: order.id,
    localStatus: pending.status,
    serverStatus: order.status,
    localUpdatedAt: pending.updatedAt,
    serverUpdatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt ?? undefined,
  }
}
