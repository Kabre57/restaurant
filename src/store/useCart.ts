import { create } from 'zustand'

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateOptions: (id: string, options: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getTax: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existingItem = state.items.find(i => i.productId === item.productId && i.options === item.options);
    if (existingItem) {
      return {
        items: state.items.map(i => 
          i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      };
    }
    return { items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }] };
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
  getSubtotal: () => {
    const items = get().items;
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
  getTax: () => {
    return get().getSubtotal() * 0.18; // 18% TVA
  },
  getTotal: () => {
    return get().getSubtotal() + get().getTax();
  }
}))
