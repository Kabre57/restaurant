'use client'

import { Minus, Plus, Receipt, Search, Trash2, X } from 'lucide-react'

import type { CatalogProduct, OrderModificationItem, OrderSummary } from '../types'

type OrderModificationModalProps = {
  order: OrderSummary
  availableProducts: CatalogProduct[]
  modifiedItems: OrderModificationItem[]
  productSearch: string
  actionLoading: boolean
  onClose: () => void
  onSubmit: () => void
  onProductSearchChange: (value: string) => void
  onAddProduct: (product: CatalogProduct) => void
  onIncrement: (index: number) => void
  onDecrement: (index: number) => void
  onRemoveItem: (index: number) => void
}

export function OrderModificationModal({
  order,
  availableProducts,
  modifiedItems,
  productSearch,
  actionLoading,
  onClose,
  onSubmit,
  onProductSearchChange,
  onAddProduct,
  onIncrement,
  onDecrement,
  onRemoveItem,
}: OrderModificationModalProps) {
  const total = modifiedItems.reduce((acc, item) => acc + item.price * item.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#dee2e6] p-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">Édition de commande</span>
            <h2 className="text-xl font-black uppercase tracking-tight text-[#212529]">Commande #{order.id.slice(-6).toUpperCase()}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-[#f8f9fa] p-2 text-[#adb5bd] hover:text-[#212529]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto p-6 custom-scrollbar md:grid-cols-2 md:p-8">
          <div className="space-y-4">
            <h3 className="border-b border-[#dee2e6] pb-2 text-xs font-black uppercase tracking-widest text-[#adb5bd]">Articles de la commande</h3>

            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {modifiedItems.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="flex items-center justify-between gap-4 rounded-2xl border border-[#dee2e6] bg-white p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black uppercase text-[#212529]">{item.name}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[#adb5bd]">{item.price.toLocaleString()} FCFA</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-[#dee2e6] bg-[#f8f9fa] p-1">
                      <button
                        type="button"
                        onClick={() => onDecrement(idx)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dee2e6] bg-white text-[#212529] transition-all hover:bg-[#e9ecef]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-black">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onIncrement(idx)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dee2e6] bg-white text-[#212529] transition-all hover:bg-[#e9ecef]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="rounded-xl p-2 text-[#adb5bd] transition-all hover:bg-[#fff5f5] hover:text-[#e03131]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {modifiedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#dee2e6] py-12 text-center text-[#adb5bd]">
                  <Receipt className="w-8 h-8 opacity-20" />
                  <span className="text-xs font-black uppercase tracking-widest">Panier vide</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="border-b border-[#dee2e6] pb-2 text-xs font-black uppercase tracking-widest text-[#adb5bd]">Ajouter des articles</h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-[#adb5bd]" />
              <input
                type="text"
                placeholder="RECHERCHER UN PRODUIT..."
                value={productSearch}
                onChange={(e) => onProductSearchChange(e.target.value)}
                className="w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
              />
            </div>

            <div className="grid max-h-[35vh] grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar sm:grid-cols-2">
              {availableProducts
                .filter(product => product.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onAddProduct(product)}
                    className="group flex flex-col rounded-2xl border border-[#dee2e6] bg-white p-3.5 text-left shadow-sm transition-all active:scale-95 hover:border-[#FF6D00] hover:shadow-md"
                  >
                    <span className="text-xs font-black uppercase text-[#212529] transition-colors group-hover:text-[#FF6D00]">{product.name}</span>
                    <span className="mt-1 text-[10px] font-bold uppercase text-[#adb5bd]">{product.price.toLocaleString()} FCFA</span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-4 border-t border-[#dee2e6] bg-[#f8f9fa] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Nouveau Total Recalculé</span>
            <p className="text-2xl font-black text-[#212529]">{total.toLocaleString()} FCFA</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#dee2e6] bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-[#212529] transition-all hover:bg-[#e9ecef]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={actionLoading}
              className="rounded-xl bg-[#FF6D00] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-[#e66200] disabled:opacity-50"
            >
              {actionLoading ? 'Mise à jour...' : 'Valider les modifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
