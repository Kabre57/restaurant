'use client'

import React, { useState, useEffect } from 'react'
import { getStoreOrders } from '@/app/actions/orders'
import { useSession } from 'next-auth/react'
import { Loader2, Receipt, Search, Filter, X, CreditCard, User, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type OrderItem = {
  id: string
  quantity: number
  price: number
  options?: string | null
  product?: {
    name?: string | null
  } | null
}

type OrderSummary = {
  id: string
  createdAt: Date | string
  type: string
  total: number
  status: string
  table?: { number: number } | null
  payments?: Array<{ method?: string | null }>
  items?: OrderItem[]
}

export default function RestaurateurCommandes() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null)

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return
    const activeStoreId = storeId

    let isCancelled = false

    async function fetchOrders() {
      setLoading(true)
      const data = await getStoreOrders(activeStoreId)
      if (isCancelled) return
      setOrders(data as OrderSummary[])
      setLoading(false)
    }

    void fetchOrders()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(search.toLowerCase()) || 
    (order.table?.number && order.table.number.toString().includes(search))
  )

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'EN_ATTENTE': return 'bg-[#fff5f5] text-[#e03131]'
      case 'PREPARATION': return 'bg-[#e6fcf5] text-[#0ca678]'
      case 'PRET': return 'bg-[#e7f5ff] text-[#1c7ed6]'
      case 'COMPLETED': return 'bg-[#f8f9fa] text-[#adb5bd]'
      case 'CANCELLED': return 'bg-[#212529] text-white'
      default: return 'bg-[#f1f3f5] text-[#495057]'
    }
  }

  const getStatusText = (status: string) => {
    switch(status) {
      case 'EN_ATTENTE': return 'EN ATTENTE'
      case 'PREPARATION': return 'EN PRÉPARATION'
      case 'PRET': return 'PRÊT'
      case 'COMPLETED': return 'TERMINÉ'
      case 'CANCELLED': return 'ANNULÉ'
      default: return status
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Historique des Commandes</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Consultez l&apos;historique complet de votre établissement</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-[#dee2e6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
          <input 
            type="text" 
            placeholder="RECHERCHER PAR ID OU NUMÉRO DE TABLE..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
          />
        </div>
        <button className="flex items-center justify-center gap-2 rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#212529] transition-all hover:bg-[#e9ecef]">
          <Filter className="w-4 h-4" />
          Filtrer
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {filteredOrders.map((order) => (
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
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
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
                  onClick={() => setSelectedOrder(order)}
                  className="mt-4 w-full rounded-xl bg-[#e7f5ff] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#339af0] transition-all hover:bg-[#d0ebff] hover:text-[#228be6]"
                >
                  Voir les détails
                </button>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-[#dee2e6] bg-white py-16 text-[#adb5bd] shadow-sm">
                <Receipt className="w-12 h-12 opacity-20" />
                <span className="text-xs font-black uppercase tracking-widest">Aucune commande trouvée</span>
              </div>
            )}
          </div>

          <div className="hidden overflow-hidden rounded-[2.5rem] border border-[#dee2e6] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left border-collapse">
            <thead>
              <tr className="bg-[#fafbfc] border-b border-[#f1f3f5]">
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">ID Commande</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Date & Heure</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Type / Table</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Montant</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Statut</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#fafbfc] transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f1f3f5] flex items-center justify-center">
                        <Receipt className="w-4 h-4 text-[#adb5bd]" />
                      </div>
                      <span className="text-xs font-black text-[#212529] font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#212529]">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                      <span className="text-[10px] font-black text-[#adb5bd] uppercase">{format(new Date(order.createdAt), 'HH:mm')}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-[#212529] uppercase">{order.type.replace('_', ' ')}</span>
                      {order.table && <span className="text-[10px] font-bold text-[#adb5bd] uppercase">Table {order.table.number}</span>}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-sm font-black text-[#212529]">{order.total.toLocaleString()} FCFA</span>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="text-[10px] font-black text-[#339af0] hover:text-[#228be6] uppercase tracking-widest bg-[#e7f5ff] hover:bg-[#d0ebff] px-4 py-2 rounded-xl transition-all"
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center text-[#adb5bd] gap-4">
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
      )}

      {/* Modal Détails Commande */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-8 lg:p-10">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 rounded-full bg-[#f8f9fa] p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="mb-8 flex flex-col gap-4 border-b border-[#dee2e6] pb-8 sm:flex-row sm:items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f8f9fa] flex items-center justify-center border border-[#dee2e6]">
                <Receipt className="w-8 h-8 text-[#212529]" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Commande #{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                  <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(selectedOrder.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="bg-[#f8f9fa] p-5 rounded-2xl border border-[#dee2e6]">
                <div className="flex items-center gap-2 mb-2 text-[#adb5bd]">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Paiement</span>
                </div>
                <p className="text-sm font-black text-[#212529]">{selectedOrder.payments?.[0]?.method || 'Non spécifié'}</p>
                <p className="text-xs font-bold text-[#495057] mt-1">{selectedOrder.total.toLocaleString()} FCFA</p>
              </div>
              <div className="bg-[#f8f9fa] p-5 rounded-2xl border border-[#dee2e6]">
                <div className="flex items-center gap-2 mb-2 text-[#adb5bd]">
                  <User className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Informations</span>
                </div>
                <p className="text-sm font-black text-[#212529]">{selectedOrder.type.replace('_', ' ')}</p>
                {selectedOrder.table && <p className="text-xs font-bold text-[#495057] mt-1">Table {selectedOrder.table.number}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest border-b border-[#dee2e6] pb-2">Articles Commandés</h3>
              <div className="space-y-3">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[#dee2e6] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[#f1f3f5] flex items-center justify-center font-black text-[#212529] text-xs">
                        x{item.quantity}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#212529] uppercase">{item.product?.name || 'Produit inconnu'}</p>
                        {item.options && <p className="text-[10px] font-bold text-[#adb5bd] uppercase mt-1">{item.options}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-black text-[#212529] sm:text-right">{(item.price * item.quantity).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2 border-t border-[#dee2e6] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-black text-[#adb5bd] uppercase tracking-widest">Total Payé</span>
              <span className="text-3xl font-black text-[#212529]">{selectedOrder.total.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
