export type PaymentMode = string
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
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  // Robust standard UUID v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
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
