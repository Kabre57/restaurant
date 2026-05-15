'use client'

import { ChevronRight, LayoutGrid, Trash2, X } from 'lucide-react'
import { CartItem } from './CartItem'
import type { OrderFlowMode } from '../lib/pos-helpers'

type POSOrderSidebarProps = {
  orderId: number
  orderFlowMode: OrderFlowMode
  selectedTableNumber?: number | null
  estimatedPrepMinutes?: number
  estimatedReadyLabel?: string | null
  primaryActionLabel?: string
  items: {
    id: string
    productId: string
    name: string
    price: number
    quantity: number
    options?: string
  }[]
  isProcessing: boolean
  subtotal: number
  tax: number
  total: number
  onClearCart: () => void
  onAddItem: (item: POSOrderSidebarProps['items'][number]) => void
  onSubItem: (item: POSOrderSidebarProps['items'][number]) => void
  onEditOptions: (itemId: string) => void
  onCheckout: () => void
  isOpen?: boolean
  onClose?: () => void
}

export function POSOrderSidebar({
  orderId,
  orderFlowMode,
  selectedTableNumber,
  estimatedPrepMinutes = 0,
  estimatedReadyLabel,
  primaryActionLabel = 'Finaliser la Commande',
  items,
  isProcessing,
  subtotal,
  tax,
  total,
  onClearCart,
  onAddItem,
  onSubItem,
  onEditOptions,
  onCheckout,
  isOpen = false,
  onClose,
}: POSOrderSidebarProps) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le panier"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-[#0f1115]/55 backdrop-blur-sm xl:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-hidden border-l border-[#e9ecef] bg-white shadow-2xl transition-transform duration-300 xl:static xl:w-[450px] xl:max-w-none xl:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-end justify-between border-b border-[#f1f3f5] p-6 pb-4 sm:p-8 sm:pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Panier Actuel</span>
            <h2 className="text-2xl font-black tracking-tight text-[#212529] sm:text-3xl">COMMANDE #{orderId || '....'}</h2>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
              {selectedTableNumber ? `Table ${selectedTableNumber}` : orderFlowMode === 'TABLE_SERVICE' ? 'Service en salle' : 'Client sur place'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button onClick={onClearCart} className="rounded-xl p-3 text-[#adb5bd] transition-all hover:bg-[#fff5f5] hover:text-[#e03131]">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-3 text-[#adb5bd] transition-all hover:bg-[#f8f9fa] hover:text-[#212529] xl:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto bg-white px-6 py-4 sm:px-8">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 opacity-20">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f1f3f5]">
                <LayoutGrid className="h-10 w-10" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest">Panier Vide</p>
            </div>
          ) : (
            items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onAdd={() => onAddItem(item)}
                onSub={() => onSubItem(item)}
                onOptionsClick={() => onEditOptions(item.id)}
              />
            ))
          )}
        </div>

        <div className="border-t border-[#e9ecef] bg-[#f8f9fa] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              {estimatedPrepMinutes > 0 && (
                <div className="rounded-2xl border border-[#e9ecef] bg-white px-4 py-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                    <span>Preparation estimee</span>
                    <span>~ {estimatedPrepMinutes} min</span>
                  </div>
                  {estimatedReadyLabel && (
                    <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                      <span>Pret vers</span>
                      <span>{estimatedReadyLabel}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                <span>TVA (18%)</span>
                <span>{tax.toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-[#212529]">
                <span className="text-xs font-black uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black tracking-tight sm:text-3xl">
                  {total.toLocaleString()} <span className="text-sm">FCFA</span>
                </span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              disabled={items.length === 0 || isProcessing}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#212529] py-5 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 hover:bg-black disabled:bg-[#adb5bd]"
            >
              {isProcessing ? 'Traitement...' : primaryActionLabel}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
