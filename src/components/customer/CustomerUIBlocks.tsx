'use client'

import React from 'react'
import { BellRing, ShoppingBag } from 'lucide-react'
import type { CartItem } from './CustomerCartModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerTopbarProps {
  storeName: string
  tableNumber: number
  searchQuery: string
  onSearchChange: (value: string) => void
}

interface CategoryBarProps {
  categories: { id: string; name: string }[]
  selectedCategory: string | 'all'
  onSelect: (id: string | 'all') => void
}

interface FloatingCartBarProps {
  cart: CartItem[]
  cartTotal: number
  isCallingServer: boolean
  onOpenCart: () => void
  onCallServer: () => void
}

// ─── Topbar ────────────────────────────────────────────────────────────────────

/**
 * Barre de navigation supérieure du menu client.
 * Affiche le nom du restaurant, le numéro de table et le champ de recherche.
 */
export function CustomerTopbar({ storeName, tableNumber, searchQuery, onSearchChange }: CustomerTopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-8 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6D00] text-white shadow-md shadow-orange-500/10">
          <ShoppingBag className="w-5.5 h-5.5" />
        </div>
        <div>
          <h1 className="text-sm font-black text-[#171717]">Table {tableNumber}</h1>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#868e96]">{storeName.toUpperCase()}</p>
        </div>
      </div>
      <div className="relative w-full sm:w-[22rem]">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          id="customer-search"
          type="text"
          placeholder="Rechercher un plat..."
          className="w-full rounded-2xl bg-[#F8F9FA] border border-[#E5E7EB] py-2.5 pl-11 pr-4 text-xs font-bold text-[#171717] placeholder-[#adb5bd] outline-none focus:border-[#FF6D00] transition-colors"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </header>
  )
}

// ─── Category Bar ─────────────────────────────────────────────────────────────

/**
 * Barre de filtrage par catégorie (pills horizontaux scrollables).
 */
export function CategoryBar({ categories, selectedCategory, onSelect }: CategoryBarProps) {
  return (
    <div className="px-8 py-5 flex items-center gap-3 overflow-x-auto bg-white border-b border-[#E5E7EB] shrink-0">
      <button
        id="category-all"
        onClick={() => onSelect('all')}
        className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
          selectedCategory === 'all'
            ? 'bg-[#FF6D00] text-white border-transparent shadow-md shadow-orange-500/10'
            : 'bg-white text-[#495057] border-[#E5E7EB] hover:bg-[#F8F9FA]'
        }`}
      >
        Tous
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          id={`category-${cat.id}`}
          onClick={() => onSelect(cat.id)}
          className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
            selectedCategory === cat.id
              ? 'bg-[#FF6D00] text-white border-transparent shadow-md shadow-orange-500/10'
              : 'bg-white text-[#495057] border-[#E5E7EB] hover:bg-[#F8F9FA]'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

// ─── Floating Cart Bar ────────────────────────────────────────────────────────

/**
 * Barre flottante en bas affichant le panier et le bouton d'appel serveur.
 * Visible uniquement quand le panier contient au moins un article.
 */
export function FloatingCartBar({ cart, cartTotal, isCallingServer, onOpenCart, onCallServer }: FloatingCartBarProps) {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0)

  return (
    <>
      {/* Bouton appel serveur */}
      <button
        type="button"
        id="call-server-btn"
        onClick={onCallServer}
        disabled={isCallingServer}
        className="fixed bottom-24 right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#E5E7EB] text-[#171717] shadow-lg hover:bg-[#F8F9FA] transition-all disabled:opacity-50"
        aria-label="Appeler un serveur"
        title="Appeler un serveur"
      >
        <BellRing className={`h-5.5 w-5.5 ${isCallingServer ? 'animate-pulse' : ''}`} />
      </button>

      {/* Barre panier flottante */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
          <button
            id="open-cart-btn"
            onClick={onOpenCart}
            className="bg-[#1C1C1E] text-white rounded-[20px] h-[52px] w-full max-w-sm shadow-xl flex items-center justify-between px-4 transition-transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#333333] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                {totalItems}
              </div>
              <span className="text-sm font-semibold">Voir le panier</span>
            </div>
            <span className="text-sm font-semibold">{cartTotal.toLocaleString()} F CFA</span>
          </button>
        </div>
      )}
    </>
  )
}
