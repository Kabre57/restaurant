'use client'

import React, { useState } from 'react'
import { X, Calendar, Utensils, AlertCircle } from 'lucide-react'
import type { Table, Reservation } from '@prisma/client'
import type { RealtimeOrder } from '../hooks/usePOSRealtime'

interface SelectTableModalProps {
  tables: Table[]
  reservations: Reservation[]
  activeOrders: RealtimeOrder[]
  onClose: () => void
  onSelect: (table: Table) => void
}

export function SelectTableModal({
  tables,
  reservations,
  activeOrders,
  onClose,
  onSelect,
}: SelectTableModalProps) {
  const [confirmingReservedTable, setConfirmingReservedTable] = useState<Table | null>(null)

  const getTableReservations = (tableId: string) => {
    return reservations.filter(
      r => r.tableId === tableId && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
    )
  }

  const handleTableClick = (table: Table) => {
    const tableReservations = getTableReservations(table.id)
    const isReserved = table.status === 'RESERVED' || tableReservations.length > 0
    
    if (isReserved) {
      setConfirmingReservedTable(table)
    } else {
      onSelect(table)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
      {confirmingReservedTable ? (
        <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <AlertCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">
            Table Réservée
          </h3>
          <p className="text-xs text-[#868e96] font-semibold mb-6">
            La table {confirmingReservedTable.number} fait l&apos;objet d&apos;une réservation active. Voulez-vous tout de même l&apos;utiliser pour cette commande ?
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setConfirmingReservedTable(null)}
              className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                const table = confirmingReservedTable
                setConfirmingReservedTable(null)
                onSelect(table)
              }}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
            >
              Confirmer
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#f8f9fa] dark:bg-[#15171e] w-full max-w-4xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tight">
                Associer une table
              </h2>
              <p className="text-xs font-bold text-[#adb5bd] uppercase tracking-widest mt-1">
                Sélectionnez la table pour finaliser la commande
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl p-3 bg-white hover:bg-red-50 text-[#868e96] hover:text-red-500 transition-all border border-[#ebeef2]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar my-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tables.map(table => {
                const tableReservations = getTableReservations(table.id)
                const tableOrder = activeOrders.find(
                  o => o.tableId === table.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
                )

                const isServedAwaitingPayment = Boolean(tableOrder?.servedAt)
                const isOccupied = !!tableOrder && !isServedAwaitingPayment && (tableOrder.status === 'EN_ATTENTE' || tableOrder.status === 'PREPARATION' || tableOrder.status === 'PRÉPARATION')
                const isReady = !!tableOrder && (tableOrder.status === 'PRET' || tableOrder.status === 'PRÊT')
                const isReserved = !tableOrder && (table.status === 'RESERVED' || tableReservations.length > 0)

                let cardBg = 'bg-white border-[#ebeef2] hover:border-[#212529] text-[#212529]'
                let badgeText = ''
                let badgeClass = ''

                if (isOccupied) {
                  cardBg = 'bg-orange-50/60 border-orange-200 hover:border-orange-500 text-orange-800'
                  badgeText = 'Occupée'
                  badgeClass = 'bg-orange-500 text-white'
                } else if (isReady) {
                  cardBg = 'bg-green-50/60 border-green-200 hover:border-green-500 text-green-800'
                  badgeText = 'Prêt'
                  badgeClass = 'bg-green-500 text-white'
                } else if (isServedAwaitingPayment) {
                  cardBg = 'bg-yellow-50/60 border-yellow-200 hover:border-yellow-500 text-yellow-900'
                  badgeText = 'À encaisser'
                  badgeClass = 'bg-yellow-500 text-white'
                } else if (isReserved) {
                  cardBg = 'bg-blue-50/60 border-blue-200 hover:border-blue-500 text-blue-800'
                  badgeText = 'Réservée'
                  badgeClass = 'bg-blue-500 text-white'
                }

                return (
                  <button
                    key={table.id}
                    onClick={() => handleTableClick(table)}
                    className={`relative flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 shadow-sm transition-all hover:scale-[1.03] select-none ${cardBg}`}
                  >
                    <span className="text-3xl font-black mb-2">{table.number}</span>
                    
                    <div className="flex items-center gap-1 opacity-60 text-xs font-bold">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>{table.capacity}p</span>
                    </div>

                    {badgeText && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm ${badgeClass}`}>
                        {badgeText}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 justify-between items-center border-t border-[#ebeef2] pt-6">
            <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-widest text-[#868e96]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#ced4da]" />
                <span>Libre</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Occupée</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span>Prêt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span>À encaisser</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Réservée</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
