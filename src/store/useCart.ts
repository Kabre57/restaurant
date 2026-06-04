import { create } from 'zustand'

export type CartItem = {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  options?: string
  image?: string | null
}

interface CartStore {
  items: CartItem[]
  /** Taux de TVA en décimal (ex: 0.18 pour 18%). Défaut 0 = prix TTC inclus */
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
  taxRate: 0, // ✅ Plus de TVA hardcodée — configurable via setTaxRate(store.taxRate)
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
  getSubtotal: () => {
    const items = get().items
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  },
  getTax: () => {
    // Taux provenant de la config du store — jamais hardcodé
    return get().getSubtotal() * get().taxRate
  },
  getTotal: () => {
    return get().getSubtotal() + get().getTax()
  }
}))


