'use client'

import type { Reservation, Table } from '@prisma/client'
import type { CachedCategory, CachedProduct } from '@/lib/idb'
import FloorPlanView from '../FloorPlanView'
import type { RealtimeOrder } from '../hooks/usePOSRealtime'
import { ReservationsList } from './ReservationsList'
import { ProductCard } from './ProductCard'
import { ServerMenuView } from './ServerMenuView'
import type { OrderFlowMode, POSViewMode } from '../lib/pos-helpers'

import { ProductGrid } from './ProductGrid'

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
  storeId: string
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
  storeId,
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
    return <ReservationsList reservations={reservations} storeId={storeId} />
  }

  // En mode serveur, on force d'abord le choix de la table avant d'afficher la carte.
  if (orderFlowMode === 'TABLE_SERVICE' && !selectedTable && viewMode !== 'POS') {
    return (
      <div className="flex-1 p-8 bg-pos-bg">
        <div className="h-full rounded-2xl border-2 border-dashed border-pos-border bg-pos-surface flex flex-col items-center justify-center text-center px-10 shadow-soft">
          <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center mb-6">
            <div className="w-10 h-10 rounded-full bg-brand-500 shadow-md" />
          </div>
          <h3 className="text-2xl font-bold text-pos-text mb-3">Service à table</h3>
          <p className="max-w-xl text-sm text-pos-text-muted leading-relaxed mb-8">
            Le serveur commence par la table, puis ajoute les menus et boissons. Choisissez d&apos;abord la table à servir.
          </p>
          <button
            onClick={onChooseTable}
            className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-xl font-semibold text-sm shadow-brand/20 transition-all active:scale-95"
          >
            Choisir une table
          </button>
        </div>
      </div>
    )
  }

  if (operatorRole === 'SERVER') {
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
    <ProductGrid
      categories={categories}
      filteredProducts={filteredProducts}
      activeCategory={activeCategory}
      onCategoryChange={onCategoryChange}
      onProductAdd={onProductAdd}
    />
  )
}
