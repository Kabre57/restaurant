'use client'

import React, { useState, useEffect } from 'react'
import { getStoreOrders } from '@/app/actions/orders'
import { useSession } from 'next-auth/react'
import { Loader2, Receipt, Search, Filter, X, CreditCard, User, Clock, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function RestaurateurCommandes() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    if (session?.user?.storeId) {
      loadOrders()
    }
  }, [session])

  async function loadOrders() {
    setLoading(true)
    const data = await getStoreOrders(session?.user?.storeId as string)
    setOrders(data)
    setLoading(false)
  }

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
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Historique des Commandes</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Consultez l'historique complet de votre établissement</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
          <input 
            type="text" 
            placeholder="RECHERCHER PAR ID OU NUMÉRO DE TABLE..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
          />
        </div>
        <button className="px-6 py-3 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl flex items-center gap-2 text-[#212529] font-black text-xs uppercase tracking-widest hover:bg-[#e9ecef] transition-all">
          <Filter className="w-4 h-4" />
          Filtrer
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-[#dee2e6] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
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
      )}

      {/* Modal Détails Commande */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529] bg-[#f8f9fa] rounded-full"><X className="w-6 h-6" /></button>
            
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[#dee2e6]">
              <div className="w-16 h-16 rounded-2xl bg-[#f8f9fa] flex items-center justify-center border border-[#dee2e6]">
                <Receipt className="w-8 h-8 text-[#212529]" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Commande #{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                <div className="flex items-center gap-3 mt-2">
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

            <div className="grid grid-cols-2 gap-6 mb-8">
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
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-[#dee2e6] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[#f1f3f5] flex items-center justify-center font-black text-[#212529] text-xs">
                        x{item.quantity}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#212529] uppercase">{item.product?.name || 'Produit inconnu'}</p>
                        {item.options && <p className="text-[10px] font-bold text-[#adb5bd] uppercase mt-1">{item.options}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-black text-[#212529]">{(item.price * item.quantity).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#dee2e6] flex items-center justify-between">
              <span className="text-xs font-black text-[#adb5bd] uppercase tracking-widest">Total Payé</span>
              <span className="text-3xl font-black text-[#212529]">{selectedOrder.total.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
