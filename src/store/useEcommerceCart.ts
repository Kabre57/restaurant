import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EcommerceCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  notes?: string;
};

interface EcommerceCartStore {
  items: EcommerceCartItem[];
  storeId: string | null;
  setStoreId: (storeId: string | null) => void;
  addItem: (item: EcommerceCartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useEcommerceCart = create<EcommerceCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      setStoreId: (storeId) => set({ storeId }),
      addItem: (item) =>
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === item.productId
          );
          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += item.quantity;
            return { items: newItems };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: "parabellum-ecommerce-cart",
    }
  )
);
