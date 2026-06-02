import type { PaymentMode } from './pos-helpers'

export type PaymentCustomer = {
  id: string
  firstName: string
  lastName: string
  phone?: string | null
  loyalty?: {
    points: number
  } | null
}

export type PaymentModalProps = {
  paymentMethods: { id: string; name: string; type: string; icon: string | null; isDefault?: boolean }[]
  total: number
  title?: string
  showCustomerSection?: boolean
  showPromoSection?: boolean
  amountReceived: string
  changeAmount: number | null
  onKey: (key: string) => void
  onDelete: () => void
  onClear: () => void
  onClose: () => void
  onFinalize: (mode: PaymentMode) => void
  isProcessing: boolean
  promoCode: string
  onPromoChange: (value: string) => void
  onApplyPromo: () => void
  discount: number
  selectedCustomer: PaymentCustomer | null
  onCustomerSearch: (query: string) => void
  customerResults: PaymentCustomer[]
  onSelectCustomer: (customer: PaymentCustomer | null) => void
  selectedBills?: { id: string; value: number }[]
  onAddBill?: (value: number) => void
  onRemoveBill?: (id: string) => void
  onResetBills?: () => void
  roundedTotal?: number | null
  roundingDiff?: number
}

