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
    priceHT: item.priceHT !== undefined && item.priceHT !== null ? item.priceHT : null,
    taxRate: item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : null,
    priceTTC: item.priceTTC !== undefined && item.priceTTC !== null ? item.priceTTC : null,
    barcode: item.barcode ?? null,
    options: item.options,
  }))
}

export function buildReceiptItemsFromOrder(order: RealtimeOrder): ReceiptOrder['items'] {
  return (order.items || []).map((item) => {
    const rateDecimal = item.taxRate !== undefined && item.taxRate !== null ? Number(item.taxRate) : 0.18
    const ratePercent = rateDecimal * 100
    const priceTtc = Number(item.price || 0)
    const priceHt = item.priceExcludingTax !== undefined && item.priceExcludingTax !== null
      ? Number(item.priceExcludingTax)
      : priceTtc / (1 + rateDecimal)
    return {
      name: item.product?.name || 'Produit',
      quantity: item.quantity,
      price: priceTtc,
      priceHT: priceHt,
      taxRate: ratePercent,
      priceTTC: priceTtc,
      barcode: (item.product as any)?.barcode || null,
      options: item.options || undefined,
    }
  })
}

function normalizePaymentLabel(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function isCashPaymentMode(mode?: string | null, paymentType?: string | null) {
  const normalizedMode = normalizePaymentLabel(mode)
  return paymentType === 'CASH' || normalizedMode === 'ESPECES' || normalizedMode === 'CASH'
}

export function buildCashReceiptMeta(
  mode: string,
  total: number,
  amountReceived: string,
  changeAmount: number | null,
  paymentType?: string | null
) {
  const isCashPayment = isCashPaymentMode(mode, paymentType)

  return {
    paymentMode: mode,
    paymentType,
    amountReceived: isCashPayment ? parseInt(amountReceived || '0', 10) : total,
    changeAmount: isCashPayment ? changeAmount ?? 0 : 0,
  }
}

export type { PaymentCustomer }
