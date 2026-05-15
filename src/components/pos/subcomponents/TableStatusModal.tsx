'use client'

import React from 'react'
import { Plus, ReceiptText, BellRing } from 'lucide-react'
import { Table } from '@prisma/client'
import type { RealtimeOrder } from '../hooks/usePOSRealtime'

interface TableStatusModalProps {
  table: Table
  order: RealtimeOrder | null
  operatorRole?: 'CASHIER' | 'SERVER'
  onClose: () => void
  onAddItems: () => void
  onSettlePayment?: () => void
  onMarkServed?: () => void
}

export function TableStatusModal({
  table,
  order,
  operatorRole = 'CASHIER',
  onClose,
  onAddItems,
  onSettlePayment,
  onMarkServed,
}: TableStatusModalProps) {
  if (!order) return null

  const estimatedReadyLabel = order.estimatedReadyAt
    ? new Date(order.estimatedReadyAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null

  const pendingPaymentAmount = (order.payments || [])
    .filter((payment) => payment.status === 'EN_ATTENTE')
    .reduce((total, payment) => total + payment.amount, 0)

  const hasPendingPayment = pendingPaymentAmount > 0
  const canMarkServed = order.status === 'PRET'

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toUpperCase()
    if (normalizedStatus === 'EN_ATTENTE') return 'text-[#e03131] bg-[#fff5f5]'
    if (normalizedStatus === 'PREPARATION' || normalizedStatus === 'PRÉPARATION') return 'text-[#f08c00] bg-[#fff4e6]'
    if (normalizedStatus === 'PRET' || normalizedStatus === 'PRÊT') return 'text-[#2f9e44] bg-[#ebfbee]'
    return 'text-[#adb5bd] bg-[#f8f9fa]'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-start mb-8 gap-6">
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {order.estimatedPrepMinutes ? (
            <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
              <p className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Estimation</p>
              <p className="text-lg font-black text-[#212529]">~ {order.estimatedPrepMinutes} min</p>
            </div>
          ) : null}
          {estimatedReadyLabel ? (
            <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
              <p className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Pret vers</p>
              <p className="text-lg font-black text-[#212529]">{estimatedReadyLabel}</p>
            </div>
          ) : null}
          {order.actualPrepMinutes ? (
            <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
              <p className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Cuisine reelle</p>
              <p className="text-lg font-black text-[#212529]">{order.actualPrepMinutes} min</p>
            </div>
          ) : null}
          <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
            <p className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Paiement</p>
            <p className="text-lg font-black text-[#212529]">
              {hasPendingPayment ? `${pendingPaymentAmount.toLocaleString()} FCFA` : 'Encaisse'}
            </p>
            <p className="text-[9px] font-bold text-[#868e96] uppercase tracking-widest mt-1">
              {hasPendingPayment ? 'En attente caisse' : 'Solde a jour'}
            </p>
          </div>
        </div>

        {canMarkServed && operatorRole === 'SERVER' && (
          <div className="mb-6 rounded-2xl bg-[#ebfbee] border border-[#b2f2bb] px-4 py-3 flex items-center gap-3">
            <BellRing className="w-4 h-4 text-[#2f9e44]" />
            <p className="text-[10px] font-black text-[#2f9e44] uppercase tracking-widest">
              La cuisine a valide cette commande. Le serveur peut maintenant la marquer comme servie.
            </p>
          </div>
        )}

        <div className="space-y-4 mb-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
              <div className="flex-1">
                <p className="text-xs font-black text-[#212529] uppercase">{item.product?.name || 'Produit'}</p>
                {item.options ? <p className="text-[9px] font-bold text-[#e03131] uppercase mt-1">Note: {item.options}</p> : null}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black bg-white px-3 py-1 rounded-lg border border-[#e9ecef]">x{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          <button onClick={onClose} className="flex-1 min-w-[150px] py-5 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
            Fermer
          </button>
          {hasPendingPayment && onSettlePayment ? (
            <button onClick={onSettlePayment} className="flex-1 min-w-[190px] py-5 bg-[#f08c00] hover:bg-[#e67700] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2">
              <ReceiptText className="w-4 h-4" />
              Encaisser la table
            </button>
          ) : null}
          {canMarkServed && operatorRole === 'SERVER' && onMarkServed ? (
            <button onClick={onMarkServed} className="flex-1 min-w-[190px] py-5 bg-[#2f9e44] hover:bg-[#2b8a3e] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">
              Marquer servie
            </button>
          ) : null}
          <button onClick={onAddItems} className="flex-[1.3] min-w-[210px] py-5 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter des articles
          </button>
        </div>
      </div>
    </div>
  )
}
