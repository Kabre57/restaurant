'use client'

import React from 'react'
import { Search, Map as MapIcon } from 'lucide-react'
import { ConnectionStatus } from './ConnectionStatus'

interface POSHeaderProps {
  viewMode: 'POS' | 'FLOOR_PLAN' | 'RESERVATIONS'
  selectedTable: any
  searchQuery: string
  setSearchQuery: (q: string) => void
  isOnline: boolean
  isSyncing: boolean
  syncQueueCount: number
  syncPendingOrders: () => void
  sessionTotal: number
  onViewPlan: () => void
}

export function POSHeader({
  viewMode,
  selectedTable,
  searchQuery,
  setSearchQuery,
  isOnline,
  isSyncing,
  syncQueueCount,
  syncPendingOrders,
  sessionTotal,
  onViewPlan
}: POSHeaderProps) {
  return (
    <header className="h-20 px-8 flex items-center justify-between bg-white border-b border-[#e9ecef] z-20">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-xl font-black text-[#212529] tracking-tighter uppercase">Point de Vente</h1>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">
              {viewMode === 'FLOOR_PLAN' ? 'Plan de Salle' : `Table ${selectedTable?.number || 'Directe'}`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {viewMode === 'POS' && (
          <button 
            onClick={onViewPlan}
            className="flex items-center gap-2 bg-[#f1f3f5] hover:bg-[#e9ecef] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <MapIcon className="w-4 h-4" />
            Changer Table
          </button>
        )}
      </div>

      <div className="flex-1 max-w-xl mx-12">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd] group-focus-within:text-[#212529] transition-colors" />
          <input 
            type="text" 
            placeholder="RECHERCHER UN PRODUIT..." 
            className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-2xl pl-12 pr-4 py-3 text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-[#212529] focus:bg-white transition-all uppercase tracking-widest"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ConnectionStatus
          isOnline={isOnline}
          isSyncing={isSyncing}
          queueCount={syncQueueCount}
          onSyncNow={syncPendingOrders}
        />
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">Mon solde jour</span>
          <span className="font-black text-[#212529] text-sm">{sessionTotal.toLocaleString()} FCFA</span>
        </div>
      </div>
    </header>
  )
}
