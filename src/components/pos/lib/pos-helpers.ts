export type PaymentMode = 'ESPECES' | 'CB' | 'MOBILE_MONEY'
export type OrderFlowMode = 'DIRECT' | 'TABLE_SERVICE'
export type POSViewMode = 'POS' | 'FLOOR_PLAN' | 'RESERVATIONS'
export { computeEstimatedPrepMinutes, formatEstimatedReadyTime, getDefaultPrepMinutes } from '@/lib/prep-estimates'

export function createInitialDisplayOrderId(seed: string) {
  const hash = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0)
  return 1000 + (hash % 9000)
}

export function nextDisplayOrderId(current: number) {
  return current >= 9999 ? 1000 : current + 1
}

export function createClientRequestId(storeId: string, cashierId: string) {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${performance.now().toString(36).replace('.', '')}`

  return `${storeId}:${cashierId}:${randomId}`
}

export function normalizeLiveOrderStatus(status?: string) {
  if (status === 'PRÉPARATION' || status === 'PREPARATION') return 'PREPARATION'
  if (status === 'PRÊT' || status === 'PRET') return 'PRET'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELLED') return 'CANCELLED'
  return 'EN_ATTENTE'
}

export function normalizeLiveOrder<T extends { status?: string }>(order: T) {
  return {
    ...order,
    status: normalizeLiveOrderStatus(order.status),
  }
}
