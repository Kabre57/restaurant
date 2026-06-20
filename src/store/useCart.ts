import { create } from 'zustand'
import { DEFAULT_VAT_RATE, computeTaxFromGrossAmount } from '@/lib/tax'

export type CartItem = {
  id: string
  productId: string
  name: string
  price: number
  priceHT?: number | null
  taxRate?: number | null
  priceTTC?: number | null
  quantity: number
  options?: string
  image?: string | null
  barcode?: string | null
}

interface CartStore {
  items: CartItem[]
  /** Taux de TVA en décimal (ex: 0.18 pour 18%). */
  taxRate: number
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateOptions: (id: string, options: string) => void
  clearCart: () => void
  /** Configure le taux de TVA depuis la config du store (appelé au chargement de la session) */
  setTaxRate: (rate: number) => void
  getTotal: () => number
  getSubtotal: () => number
  getTax: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  taxRate: DEFAULT_VAT_RATE,
  addItem: (item) => set((state) => {
    const existingItem = state.items.find(
      i => i.productId === item.productId && i.options === item.options
    )
    if (existingItem) {
      return {
        items: state.items.map(i =>
          i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      }
    }
    return { items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }] }
  }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id)
  })),
  updateQuantity: (id, quantity) => set((state) => ({
    items: state.items.map((item) => item.id === id ? { ...item, quantity } : item)
  })),
  updateOptions: (id, options) => set((state) => ({
    items: state.items.map((item) => item.id === id ? { ...item, options } : item)
  })),
  clearCart: () => set({ items: [] }),
  setTaxRate: (rate) => set({ taxRate: Math.max(0, Math.min(1, rate)) }),
  getTotal: () => {
    const items = get().items
    return items.reduce((total, item) => {
      const unitTtc = item.priceTTC ?? item.price
      return total + (unitTtc * item.quantity)
    }, 0)
  },
  getSubtotal: () => {
    const items = get().items
    const globalRate = get().taxRate
    const subtotal = items.reduce((total, item) => {
      if (item.priceHT !== undefined && item.priceHT !== null) {
        return total + (item.priceHT * item.quantity)
      }
      const unitTtc = item.priceTTC ?? item.price
      const unitHt = unitTtc / (1 + globalRate)
      return total + (unitHt * item.quantity)
    }, 0)
    return Math.round(subtotal * 100) / 100
  },
  getTax: () => {
    const items = get().items
    const globalRate = get().taxRate
    const tax = items.reduce((total, item) => {
      const unitTtc = item.priceTTC ?? item.price
      if (item.priceHT !== undefined && item.priceHT !== null) {
        const itemTtc = unitTtc * item.quantity
        const itemHt = item.priceHT * item.quantity
        return total + (itemTtc - itemHt)
      }
      const unitHt = unitTtc / (1 + globalRate)
      const itemTax = (unitTtc - unitHt) * item.quantity
      return total + itemTax
    }, 0)
    return Math.round(tax * 100) / 100
  }
}))

