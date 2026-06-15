import type { OrderSummary } from './types'

export function getPrimaryPayment(order: OrderSummary) {
  return (
    order.payments?.find(payment => payment.status === 'REUSSIE') ||
    order.payments?.find(payment => payment.status === 'REMBOURSEE') ||
    order.payments?.find(payment => payment.status === 'EN_ATTENTE') ||
    order.payments?.[0] ||
    null
  )
}

export function hasSucceededPayment(order: OrderSummary) {
  return order.payments?.some(payment => payment.status === 'REUSSIE') ?? false
}

export function hasRefundedPayment(order: OrderSummary) {
  return order.payments?.some(payment => payment.status === 'REMBOURSEE') ?? false
}

export function canCancelOrder(order: OrderSummary) {
  return order.status !== 'CANCELLED' && order.status !== 'COMPLETED'
}

export function canRefundOrder(order: OrderSummary) {
  return hasSucceededPayment(order)
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'EN_ATTENTE':
      return 'bg-[#fff5f5] text-[#e03131]'
    case 'PREPARATION':
      return 'bg-[#e6fcf5] text-[#0ca678]'
    case 'PRET':
      return 'bg-[#e7f5ff] text-[#1c7ed6]'
    case 'COMPLETED':
      return 'bg-[#f8f9fa] text-[#adb5bd]'
    case 'CANCELLED':
      return 'bg-[#212529] text-white'
    default:
      return 'bg-[#f1f3f5] text-[#495057]'
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case 'EN_ATTENTE':
      return 'EN ATTENTE'
    case 'PREPARATION':
      return 'EN PRÉPARATION'
    case 'PRET':
      return 'PRÊT'
    case 'COMPLETED':
      return 'TERMINÉ'
    case 'CANCELLED':
      return 'ANNULÉ'
    default:
      return status
  }
}

export function getPaymentMethodName(order: OrderSummary) {
  return getPrimaryPayment(order)?.paymentMethod?.name || 'Non spécifié'
}

export function getPaymentStatusColor(order: OrderSummary) {
  const status = getPrimaryPayment(order)?.status || 'EN_ATTENTE'
  switch (status) {
    case 'REUSSIE':
      return 'bg-[#ebfbee] text-[#2f9e44]'
    case 'EN_ATTENTE':
      return 'bg-[#fff9db] text-[#f08c00]'
    case 'ECHOUEE':
      return 'bg-[#fff5f5] text-[#e03131]'
    case 'REMBOURSEE':
      return 'bg-[#e7f5ff] text-[#1c7ed6]'
    default:
      return 'bg-[#f1f3f5] text-[#495057]'
  }
}

export function getPaymentStatusText(order: OrderSummary) {
  const status = getPrimaryPayment(order)?.status || 'EN_ATTENTE'
  switch (status) {
    case 'REUSSIE':
      return 'PAYÉ'
    case 'EN_ATTENTE':
      return 'À ENCAISSER'
    case 'ECHOUEE':
      return 'ÉCHOUÉ'
    case 'REMBOURSEE':
      return 'REMBOURSÉ'
    default:
      return status
  }
}
