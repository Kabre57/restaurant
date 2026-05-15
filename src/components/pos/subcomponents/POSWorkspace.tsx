'use client'

import type { Reservation, Table } from '@prisma/client'
import type { CachedCategory, CachedProduct } from '@/lib/idb'
import FloorPlanView from '../FloorPlanView'
import type { RealtimeOrder } from '../hooks/usePOSRealtime'
import { ReservationsList } from './ReservationsList'
import { ProductCard } from './ProductCard'
import { ServerMenuView } from './ServerMenuView'
import type { OrderFlowMode, POSViewMode } from '../lib/pos-helpers'

type POSWorkspaceProps = {
  viewMode: POSViewMode
  operatorRole?: 'CASHIER' | 'SERVER'
  orderFlowMode: OrderFlowMode
  selectedTable: Table | null
  tables: Table[]
  reservations: Reservation[]
  activeOrders: RealtimeOrder[]
  categories: CachedCategory[]
  filteredProducts: CachedProduct[]
  activeCategory: string | null
  onCategoryChange: (categoryId: string | null) => void
  onProductAdd: (product: CachedProduct) => void
  onTableSelect: (table: Table) => void
  onTableBook: (table: Table) => void
  onChooseTable: () => void
}

export function POSWorkspace({
  viewMode,
  operatorRole = 'CASHIER',
  orderFlowMode,
  selectedTable,
  tables,
  reservations,
  activeOrders,
  categories,
  filteredProducts,
  activeCategory,
  onCategoryChange,
  onProductAdd,
  onTableSelect,
  onTableBook,
  onChooseTable,
}: POSWorkspaceProps) {
  if (viewMode === 'FLOOR_PLAN') {
    return (
      <FloorPlanView
        tables={tables}
        reservations={reservations}
        activeOrders={activeOrders}
        onTableSelect={onTableSelect}
        onTableBook={onTableBook}
        selectedTableId={selectedTable?.id}
      />
    )
  }

  if (viewMode === 'RESERVATIONS') {
    return <ReservationsList reservations={reservations} />
  }

  // En mode serveur, on force d'abord le choix de la table avant d'afficher la carte.
  if (orderFlowMode === 'TABLE_SERVICE' && !selectedTable) {
    return (
      <div className="flex-1 p-8">
        <div className="h-full rounded-[2.5rem] border border-dashed border-[#ced4da] bg-white/70 flex flex-col items-center justify-center text-center px-10">
          <div className="w-24 h-24 rounded-[2rem] bg-[#f1f3f5] flex items-center justify-center mb-6">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#dee2e6]" />
          </div>
          <h3 className="text-2xl font-black text-[#212529] uppercase tracking-tight mb-3">Service a table</h3>
          <p className="max-w-xl text-sm font-bold text-[#868e96] leading-relaxed mb-8">
            Le serveur commence par la table, puis ajoute les menus et boissons. Choisissez d&apos;abord la table a servir.
          </p>
          <button
            onClick={onChooseTable}
            className="bg-[#212529] hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all"
          >
            Choisir une table
          </button>
        </div>
      </div>
    )
  }

  if (operatorRole === 'SERVER' && selectedTable) {
    return (
      <ServerMenuView
        categories={categories}
        filteredProducts={filteredProducts}
        activeCategory={activeCategory}
        selectedTable={selectedTable}
        onCategoryChange={onCategoryChange}
        onProductAdd={onProductAdd}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="flex gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${!activeCategory ? 'bg-[#212529] text-white shadow-xl scale-105' : 'bg-white text-[#adb5bd] hover:bg-[#f8f9fa] border border-[#e9ecef]'}`}
        >
          Tous les produits
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${activeCategory === category.id ? 'bg-[#212529] text-white shadow-xl scale-105' : 'bg-white text-[#adb5bd] hover:bg-[#f8f9fa] border border-[#e9ecef]'}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categoryName={categories.find((category) => category.id === product.categoryId)?.name || 'General'}
            onAdd={() => onProductAdd(product)}
          />
        ))}
      </div>
    </div>
  )
}
