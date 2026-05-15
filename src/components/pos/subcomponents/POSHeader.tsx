'use client'

import React from 'react'
import type { Table } from '@prisma/client'
import { Search, Map as MapIcon, Menu, ShoppingBag } from 'lucide-react'
import { ConnectionStatus } from './ConnectionStatus'
import type { OrderFlowMode, POSViewMode } from '../lib/pos-helpers'

interface POSHeaderProps {
  viewMode: POSViewMode
  operatorRole?: 'CASHIER' | 'SERVER'
  orderFlowMode: OrderFlowMode
  flowModeLocked?: boolean
  selectedTable: Table | null
  searchQuery: string
  setSearchQuery: (q: string) => void
  isOnline: boolean
  isSyncing: boolean
  syncQueueCount: number
  syncPendingOrders: () => void
  sessionTotal: number
  onViewPlan: () => void
  onFlowModeChange: (mode: 'DIRECT' | 'TABLE_SERVICE') => void
  onOpenSidebar?: () => void
  onOpenCart?: () => void
  cartCount?: number
}

export function POSHeader({
  viewMode,
  operatorRole = 'CASHIER',
  orderFlowMode,
  flowModeLocked = false,
  selectedTable,
  searchQuery,
  setSearchQuery,
  isOnline,
  isSyncing,
  syncQueueCount,
  syncPendingOrders,
  sessionTotal,
  onViewPlan,
  onFlowModeChange,
  onOpenSidebar,
  onOpenCart,
  cartCount = 0,
}: POSHeaderProps) {
  const title = operatorRole === 'SERVER' ? 'Service Salle' : 'Point de Vente'
  const contextLabel = selectedTable
    ? `Table ${selectedTable.number}`
    : orderFlowMode === 'TABLE_SERVICE'
      ? 'Service en salle'
      : 'Client sur place'

  return (
    <header className="shrink-0 border-b border-[#e9ecef] bg-white px-4 py-4 z-20 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e9ecef] bg-[#f8f9fa] text-[#212529] transition-all hover:bg-[#f1f3f5] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tighter text-[#212529] md:text-xl">{title}</h1>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#adb5bd]">
                {viewMode === 'FLOOR_PLAN' ? 'Plan de Salle' : contextLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e9ecef] bg-[#f8f9fa] text-[#212529] transition-all hover:bg-[#f1f3f5] xl:hidden"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#212529] px-1 text-[9px] font-black text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-3 xl:flex-1 xl:flex-row xl:items-center xl:justify-end">
          {!flowModeLocked && (
            <div className="flex items-center overflow-x-auto rounded-2xl border border-[#e9ecef] bg-[#f1f3f5] p-1 no-scrollbar">
              <button
                onClick={() => onFlowModeChange('DIRECT')}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  orderFlowMode === 'DIRECT'
                    ? 'bg-[#212529] text-white shadow-lg'
                    : 'text-[#adb5bd] hover:text-[#212529]'
                }`}
              >
                Caisse directe
              </button>
              <button
                onClick={() => onFlowModeChange('TABLE_SERVICE')}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  orderFlowMode === 'TABLE_SERVICE'
                    ? 'bg-[#212529] text-white shadow-lg'
                    : 'text-[#adb5bd] hover:text-[#212529]'
                }`}
              >
                Service a table
              </button>
            </div>
          )}

          {viewMode === 'POS' && (
            <button
              onClick={onViewPlan}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#f1f3f5] px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#e9ecef] xl:justify-start"
            >
              <MapIcon className="h-4 w-4" />
              {selectedTable ? `Table ${selectedTable.number}` : orderFlowMode === 'DIRECT' ? 'Attribuer table' : 'Choisir table'}
            </button>
          )}

          <div className="relative min-w-0 xl:mx-2 xl:max-w-xl xl:flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
            <input
              type="text"
              placeholder="RECHERCHER UN PRODUIT..."
              className="w-full rounded-2xl border border-[#e9ecef] bg-[#f8f9fa] py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#212529]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 xl:justify-end">
            <ConnectionStatus
              isOnline={isOnline}
              isSyncing={isSyncing}
              queueCount={syncQueueCount}
              onSyncNow={syncPendingOrders}
            />
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#adb5bd]">Mon solde jour</span>
              <span className="text-sm font-black text-[#212529]">{sessionTotal.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
