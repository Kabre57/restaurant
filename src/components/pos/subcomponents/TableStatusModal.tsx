'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { Table } from '@prisma/client'

interface TableStatusModalProps {
  table: Table
  order: any
  onClose: () => void
  onAddItems: () => void
}

export function TableStatusModal({ table, order, onClose, onAddItems }: TableStatusModalProps) {
  if (!order) return null

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase()
    if (s === 'EN_ATTENTE') return 'text-[#e03131] bg-[#fff5f5]'
    if (s === 'PREPARATION' || s === 'PRÉPARATION') return 'text-[#f08c00] bg-[#fff4e6]'
    if (s === 'PRET' || s === 'PRÊT') return 'text-[#2f9e44] bg-[#ebfbee]'
    return 'text-[#adb5bd] bg-[#f8f9fa]'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Table {table.number}</h2>
            <div className={`mt-2 inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
              {order.status}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Total Actuel</p>
            <p className="text-2xl font-black text-[#212529]">{order.total?.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="space-y-4 mb-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
              <div className="flex-1">
                <p className="text-xs font-black text-[#212529] uppercase">{item.product.name}</p>
                {item.options && <p className="text-[9px] font-bold text-[#e03131] uppercase mt-1">Note: {item.options}</p>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black bg-white px-3 py-1 rounded-lg border border-[#e9ecef]">x{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Fermer</button>
          <button onClick={onAddItems} className="flex-[1.5] py-5 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter des articles
          </button>
        </div>
      </div>
    </div>
  )
}
