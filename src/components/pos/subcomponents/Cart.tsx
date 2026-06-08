// src/components/pos/subcomponents/Cart.tsx
'use client'

import React from 'react'
import { LayoutGrid, Trash2, X, ChevronRight } from 'lucide-react'
import { CartItem } from './CartItem'
import { Button } from '@/components/ui/Button'
import type { CartItem as CartItemData } from '@/store/useCart'
import type { OrderFlowMode } from '../lib/pos-helpers'

interface CartProps {
  orderId: number
  orderFlowMode: OrderFlowMode
  selectedTableNumber?: number | null
  items: CartItemData[]
  isProcessing: boolean
  subtotal: number
  tax: number
  total: number
  onClearCart: () => void
  onAddItem: (item: CartItemData) => void
  onSubItem: (item: CartItemData) => void
  onEditOptions: (itemId: string) => void
  onCheckout: () => void
  onClose?: () => void
}

export function Cart({
  orderId,
  orderFlowMode,
  selectedTableNumber,
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
  onClose,
}: CartProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--ui-surface)]">
      {/* En-tête du Panier */}
      <div className="flex items-end justify-between border-b border-[var(--ui-border)] p-6 pb-4 sm:p-8 sm:pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ui-text-muted)]">Panier Actuel</span>
          <h2 className="text-2xl font-black tracking-tight text-[var(--ui-text)] sm:text-3xl">COMMANDE #{orderId || '....'}</h2>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--ui-text-muted)]">
            {selectedTableNumber ? `Table ${selectedTableNumber}` : orderFlowMode === 'TABLE_SERVICE' ? 'Service en salle' : 'Client sur place'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--ui-text-muted)] hover:bg-[var(--ui-danger-light)] hover:text-[var(--ui-danger)] transition-all active:scale-90"
              aria-label="Vider le panier"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--ui-text-muted)] hover:bg-[var(--ui-secondary-light)] hover:text-[var(--ui-text)] transition-all xl:hidden active:scale-95"
              aria-label="Fermer le panier"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu du Panier */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4 sm:px-8 touch-manipulation">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 opacity-20 text-[var(--ui-text)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--ui-secondary-light)]">
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

      {/* Résumé financier & Validation tactile */}
      <div className="border-t border-[var(--ui-border)] bg-[var(--ui-bg)] p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-[var(--ui-text)]">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--ui-text-muted)]">
            <span>Sous-total</span>
            <span>{subtotal.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--ui-text-muted)]">
            <span>TVA (18%)</span>
            <span>{tax.toLocaleString()} FCFA</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-[var(--ui-text)]">
            <span className="text-xs font-black uppercase tracking-widest">Total</span>
            <span className="text-2xl font-black tracking-tight sm:text-3xl">
              {total.toLocaleString()} <span className="text-sm">FCFA</span>
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onCheckout}
          disabled={items.length === 0 || isProcessing}
        >
          {isProcessing ? 'Traitement...' : 'Valider la Commande'}
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
