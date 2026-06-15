export type OrderItem = {
  id: string
  productId?: string
  quantity: number
  price: number
  options?: string | null
  product?: {
    id?: string
    name?: string | null
  } | null
}

export type OrderPayment = {
  status: string
  amount?: number
  paymentMethod?: {
    name?: string | null
    type?: string | null
  } | null
}

export type OrderSummary = {
  id: string
  createdAt: Date | string
  type: string
  total: number
  status: string
  table?: { number: number } | null
  payments?: OrderPayment[]
  items?: OrderItem[]
}

export type CatalogProduct = {
  id: string
  name: string
  price: number
}

export type OrderModificationItem = {
  productId: string
  name: string
  price: number
  quantity: number
  options: string
}
