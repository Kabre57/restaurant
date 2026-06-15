'use client'

import { CreditCard, User, Clock, X, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { OrderSummary } from '../types'
import {
  canCancelOrder,
  canRefundOrder,
  getPaymentMethodName,
  getPaymentStatusColor,
  getPaymentStatusText,
  getPrimaryPayment,
  getStatusColor,
  getStatusText,
  hasRefundedPayment,
  hasSucceededPayment,
} from '../helpers'

type OrderDetailsModalProps = {
  order: OrderSummary
  actionLoading: boolean
  onClose: () => void
  onCancelOrder: (order: OrderSummary) => void
  onRefundOrder: (order: OrderSummary) => void
  onStartModification: (order: OrderSummary) => void
}

export function OrderDetailsModal({
  order,
  actionLoading,
  onClose,
  onCancelOrder,
  onRefundOrder,
  onStartModification,
}: OrderDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-8 lg:p-10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-[#f8f9fa] p-2 text-[#adb5bd] hover:text-[#212529] sm:right-6 sm:top-6"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8 flex flex-col gap-4 border-b border-[#dee2e6] pb-8 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#dee2e6] bg-[#f8f9fa]">
            <Receipt className="w-8 h-8 text-[#212529]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#212529]">Commande #{order.id.slice(-6).toUpperCase()}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getPaymentStatusColor(order)}`}>
                {getPaymentStatusText(order)}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">
                <Clock className="w-3 h-3" />
                {format(new Date(order.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-5">
            <div className="mb-2 flex items-center gap-2 text-[#adb5bd]">
              <CreditCard className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Paiement</span>
            </div>
            <p className="text-sm font-black text-[#212529]">{getPaymentMethodName(order)}</p>
            <p className="mt-1 text-xs font-bold text-[#495057]">
              {getPaymentStatusText(order)} · {order.total.toLocaleString()} FCFA
            </p>
          </div>
          <div className="rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-5">
            <div className="mb-2 flex items-center gap-2 text-[#adb5bd]">
              <User className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Informations</span>
            </div>
            <p className="text-sm font-black text-[#212529]">{order.type.replace('_', ' ')}</p>
            {order.table && <p className="mt-1 text-xs font-bold text-[#495057]">Table {order.table.number}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="border-b border-[#dee2e6] pb-2 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Articles Commandés</h3>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[#dee2e6] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1f3f5] text-xs font-black text-[#212529]">
                    x{item.quantity}
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase text-[#212529]">{item.product?.name || 'Produit inconnu'}</p>
                    {item.options && <p className="mt-1 text-[10px] font-bold uppercase text-[#adb5bd]">{item.options}</p>}
                  </div>
                </div>
                <span className="text-sm font-black text-[#212529] sm:text-right">{(item.price * item.quantity).toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[#dee2e6] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-[#adb5bd]">
            {getPrimaryPayment(order)?.status === 'REUSSIE' ? 'Total Payé' : 'Total Commande'}
          </span>
          <span className="text-3xl font-black text-[#212529]">{(order.total || 0).toLocaleString()} FCFA</span>
        </div>

        {hasRefundedPayment(order) && (
          <div className="mt-6 rounded-2xl border border-[#d0ebff] bg-[#e7f5ff] p-4 text-xs font-bold text-[#1c7ed6]">
            Remboursement enregistré. Cette vente ne sera plus comptabilisée comme paiement réussi.
          </div>
        )}

        {(canCancelOrder(order) || canRefundOrder(order)) && (
          <div className="mt-6 grid gap-3 border-t border-[#dee2e6] pt-6 sm:grid-cols-2">
            {canCancelOrder(order) && (
              <button
                onClick={() => onCancelOrder(order)}
                disabled={actionLoading}
                className="rounded-2xl bg-[#fff5f5] px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-[#e03131] transition-all hover:bg-[#ffe3e3] disabled:opacity-50"
              >
                {hasSucceededPayment(order) ? 'Annuler sans rembourser' : 'Annuler la commande'}
              </button>
            )}
            {canRefundOrder(order) && (
              <button
                onClick={() => onRefundOrder(order)}
                disabled={actionLoading}
                className="rounded-2xl bg-[#ebfbee] px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-[#2f9e44] transition-all hover:bg-[#d3f9d8] disabled:opacity-50"
              >
                {order.status === 'CANCELLED'
                  ? 'Rembourser maintenant'
                  : order.status === 'COMPLETED'
                    ? 'Rembourser la vente'
                    : 'Annuler & rembourser'}
              </button>
            )}
            {canCancelOrder(order) && (
              <button
                onClick={() => onStartModification(order)}
                disabled={actionLoading}
                className="rounded-2xl bg-[#e7f5ff] px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-[#339af0] transition-all hover:bg-[#d0ebff] disabled:opacity-50 sm:col-span-2"
              >
                Modifier la commande
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
