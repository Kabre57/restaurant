'use client'

import { Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { OrderSummary } from '../types'
import {
  getPaymentMethodName,
  getPaymentStatusColor,
  getPaymentStatusText,
  getStatusColor,
  getStatusText,
} from '../helpers'

type OrdersListProps = {
  orders: OrderSummary[]
  onSelectOrder: (order: OrderSummary) => void
}

export function OrdersList({ orders, onSelectOrder }: OrdersListProps) {
  return (
    <>
      <div className="space-y-4 md:hidden">
        {orders.map((order) => (
          <div key={order.id} className="rounded-[2rem] border border-[#dee2e6] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f3f5]">
                    <Receipt className="w-4 h-4 text-[#adb5bd]" />
                  </div>
                  <span className="text-xs font-black font-mono text-[#212529]">#{order.id.slice(-6).toUpperCase()}</span>
                </div>
                <p className="mt-3 text-xs font-bold text-[#212529]">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}</p>
                <p className="text-[10px] font-black uppercase text-[#adb5bd]">{format(new Date(order.createdAt), 'HH:mm')}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getPaymentStatusColor(order)}`}>
                  {getPaymentStatusText(order)}
                </span>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Type</p>
                <p className="mt-1 text-xs font-black uppercase text-[#212529]">{order.type.replace('_', ' ')}</p>
                {order.table && <p className="text-[10px] font-bold uppercase text-[#adb5bd]">Table {order.table.number}</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Montant</p>
                <p className="mt-1 text-sm font-black text-[#212529]">{order.total.toLocaleString()} FCFA</p>
              </div>
            </div>

            <button
              onClick={() => onSelectOrder(order)}
              className="mt-4 w-full rounded-xl bg-[#e7f5ff] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#339af0] transition-all hover:bg-[#d0ebff] hover:text-[#228be6]"
            >
              Voir les détails
            </button>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-[#dee2e6] bg-white py-16 text-[#adb5bd] shadow-sm">
            <Receipt className="w-12 h-12 opacity-20" />
            <span className="text-xs font-black uppercase tracking-widest">Aucune commande trouvée</span>
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-[2.5rem] border border-[#dee2e6] bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#f1f3f5] bg-[#fafbfc]">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">ID Commande</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Date & Heure</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Type / Table</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Montant</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Paiement</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Cuisine</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {orders.map((order) => (
                <tr key={order.id} className="group transition-all hover:bg-[#fafbfc]">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1f3f5]">
                        <Receipt className="w-4 h-4 text-[#adb5bd]" />
                      </div>
                      <span className="font-mono text-xs font-black text-[#212529]">#{order.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#212529]">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                      <span className="text-[10px] font-black uppercase text-[#adb5bd]">{format(new Date(order.createdAt), 'HH:mm')}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase text-[#212529]">{order.type.replace('_', ' ')}</span>
                      {order.table && <span className="text-[10px] font-bold uppercase text-[#adb5bd]">Table {order.table.number}</span>}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-sm font-black text-[#212529]">{order.total.toLocaleString()} FCFA</span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getPaymentStatusColor(order)}`}>
                        {getPaymentStatusText(order)}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-[#adb5bd]">{getPaymentMethodName(order)}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button
                      onClick={() => onSelectOrder(order)}
                      className="rounded-xl bg-[#e7f5ff] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#339af0] transition-all hover:bg-[#d0ebff] hover:text-[#228be6]"
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-[#adb5bd]">
                      <Receipt className="w-12 h-12 opacity-20" />
                      <span className="text-xs font-black uppercase tracking-widest">Aucune commande trouvée</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
