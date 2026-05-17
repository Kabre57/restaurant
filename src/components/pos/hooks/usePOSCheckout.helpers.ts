import type { CartItem } from '@/store/useCart'
import type { PaymentCustomer } from '../lib/payment-types'
import type { ReceiptOrder } from '../subcomponents/ReceiptModal'
import type { RealtimeOrder } from './usePOSRealtime'

export type AlertPayload = {
  title: string
  message: string
  type?: 'error' | 'success' | 'info'
}

export type PaymentContext =
  | { kind: 'NEW_ORDER' }
  | { kind: 'SETTLEMENT'; order: RealtimeOrder }

export function buildReceiptItemsFromCart(items: CartItem[]): ReceiptOrder['items'] {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }))
}

export function buildReceiptItemsFromOrder(order: RealtimeOrder): ReceiptOrder['items'] {
  return (order.items || []).map((item) => ({
    name: item.product?.name || 'Produit',
    quantity: item.quantity,
    price: Number(item.price || 0),
  }))
}

export function buildCashReceiptMeta(
  mode: string,
  total: number,
  amountReceived: string,
  changeAmount: number | null
) {
  return {
    paymentMode: mode,
    amountReceived: mode === 'ESPECES' ? parseInt(amountReceived || '0', 10) : total,
    changeAmount: mode === 'ESPECES' ? changeAmount ?? 0 : 0,
  }
}

export type { PaymentCustomer }
