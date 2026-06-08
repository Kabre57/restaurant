'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Utensils, Navigation, Clock, CheckCircle2, LayoutList, ChefHat, BellRing, LogOut, RefreshCw, AlertTriangle, ShoppingCart } from 'lucide-react'
import { ServerColumn } from './ServerColumn'
import { markOrderServed } from '@/app/actions/orders/orderLifecycle'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { playNotificationSound } from '@/lib/sound'

type OrderItem = {
  id: string
  quantity: number
  product: { name: string }
}

export type ServerOrder = {
  id: string
  status: string
  storeId: string
  createdAt: Date
  preparationStartedAt?: Date | string | null
  servedAt?: Date | string | null
  items: OrderItem[]
  table?: { number: number } | null
}

export default function ServerTicketsClient({ 
  initialOrders, 
  storeId,
  storeName,
  operatorName
}: { 
  initialOrders: ServerOrder[]
  storeId: string
  storeName: string
  operatorName: string
}) {
  const router = useRouter()
  const [orders, setOrders] = useState<ServerOrder[]>(initialOrders)
  const [activeView, setActiveView] = useState<'TICKETS' | 'ALERTES'>('TICKETS')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connectToStream() {
      eventSourceRef.current?.close()
      const eventSource = new EventSource(`/api/kds/stream?storeId=${encodeURIComponent(storeId)}&station=ALL`)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('new-order', (event) => {
        const newOrder = JSON.parse(event.data)
        if (newOrder.storeId !== storeId) return
        playNotificationSound('info')
        setOrders(prev => {
          const exists = prev.some(order => order.id === newOrder.id)
          return exists ? prev.map(order => order.id === newOrder.id ? newOrder : order) : [...prev, newOrder]
        })
      })

      eventSource.addEventListener('order-updated', (event) => {
        const updatedOrder = JSON.parse(event.data)
        if (updatedOrder.storeId !== storeId) return

        if (updatedOrder.status === 'PRET') {
          playNotificationSound('success')
        }

        setOrders(prev => {
          const exists = prev.find(o => o.id === updatedOrder.id)
          if (exists) {
            return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
          }
          return [...prev, updatedOrder]
        })
      })

      eventSource.onerror = () => {
        eventSource.close()
        setTimeout(connectToStream, 3000)
      }
    }

    connectToStream()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [storeId])

  const handleTransmit = async (orderId: string) => {
    try {
      const res = await markOrderServed(orderId, storeId)
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'SERVED', servedAt: new Date() } : o))
      }
    } catch (error) {
      console.error('Failed to transmit order:', error)
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.replace('/login')
  }

  // Derive orders by column
  const inKitchenOrders = orders.filter(o => !o.servedAt && (o.status === 'PREPARATION' || o.status === 'EN_ATTENTE' || o.status === 'PRÉPARATION'))
  const readyOrders = orders.filter(o => !o.servedAt && (o.status === 'PRET' || o.status === 'PRÊT'))
  const servedOrders = orders.filter(o => o.servedAt && o.status !== 'CANCELLED')

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#171717] font-sans">
      {/* Sidebar */}
      <aside className="flex w-24 flex-col items-center border-r border-[#E5E7EB] bg-white py-6 shadow-sm">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6D00] shadow-lg shadow-orange-500/30 text-white">
          <Utensils className="h-7 w-7" />
        </div>

        <nav className="flex w-full flex-col gap-2 px-3">
          <button 
            onClick={() => setActiveView('TICKETS')}
            className={`group flex flex-col items-center gap-1.5 rounded-2xl py-3.5 transition-all w-full ${activeView === 'TICKETS' ? 'bg-[#FF6D00]/10 text-[#FF6D00]' : 'text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#212529]'}`}
          >
            <LayoutList className="h-5.5 w-5.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Tickets</span>
          </button>
          
          <button 
            onClick={() => router.push('/kds')}
            className="group flex flex-col items-center gap-1.5 rounded-2xl py-3.5 text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#212529] transition-all w-full"
          >
            <ChefHat className="h-5.5 w-5.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Cuisine</span>
          </button>

          <button 
            onClick={() => setActiveView('ALERTES')}
            className={`group flex flex-col items-center gap-1.5 rounded-2xl py-3.5 transition-all w-full relative ${activeView === 'ALERTES' ? 'bg-[#FF6D00]/10 text-[#FF6D00]' : 'text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#212529]'}`}
          >
            <BellRing className="h-5.5 w-5.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Alertes</span>
            {readyOrders.length > 0 && (
              <div className="absolute right-4 top-2 h-2.5 w-2.5 rounded-full bg-[#FF6D00] animate-pulse"></div>
            )}
          </button>
          <button 
            onClick={() => router.push('/cashier')}
            className="group flex flex-col items-center gap-1.5 rounded-2xl py-3.5 bg-[#FF6D00] text-white shadow-lg shadow-orange-500/20 transition-all w-full hover:bg-orange-600"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Commande</span>
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex flex-col items-center gap-1.5 text-[#868e96] hover:text-[#FF6D00] transition-all"
        >
          <LogOut className="h-5.5 w-5.5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Sortir</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-8 py-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-[#212529]">
              {activeView === 'TICKETS' ? 'Tickets serveur' : 'Alertes de service'}
            </h1>
            <p className="text-xs font-medium text-[#868e96] mt-1">{storeName} — {operatorName}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-[#212529]/5 px-3 py-1.5 border border-[#E5E7EB]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">Cuisine</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-lg bg-white text-[10px] font-black text-[#212529] border border-[#E5E7EB] shadow-sm">{inKitchenOrders.length}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#FF6D00]/10 px-3 py-1.5 border border-[#FF6D00]/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">Prêt</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-lg bg-white text-[10px] font-black text-[#FF6D00] border border-[#FF6D00]/20 shadow-sm">{readyOrders.length}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#212529]/5 px-3 py-1.5 border border-[#E5E7EB]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Caisse</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-lg bg-white text-[10px] font-black text-[#868e96] border border-[#E5E7EB] shadow-sm">{servedOrders.length}</span>
              </div>
            </div>

            <button 
              onClick={() => router.push('/cashier')}
              className="flex items-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Prendre Commande
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#212529] hover:bg-[#F8F9FA] transition-all shadow-sm"
            >
              <RefreshCw className="h-3 w-3" />
              Actualiser
            </button>
          </div>
        </header>

        {/* Tickets Columns / Alertes View */}
        {activeView === 'TICKETS' ? (
          <div className="flex flex-1 gap-6 overflow-x-auto p-8 custom-scrollbar">
            <ServerColumn 
              title="En Cuisine" 
              subtitle="Tickets reçus, en préparation" 
              orders={inKitchenOrders} 
              icon={<Clock className="h-4 w-4" />}
              emptyMessage="Aucun ticket en attente"
            />

            <ServerColumn 
              title="À Transmettre" 
              subtitle="Commandes prêtes pour service" 
              orders={readyOrders} 
              icon={<Navigation className="h-4 w-4" />}
              emptyMessage="Aucune commande prête"
              showTransmitButton
              onTransmit={handleTransmit}
            />

            <ServerColumn 
              title="Caisse" 
              subtitle="Tickets servis, paiement en attente" 
              orders={servedOrders} 
              icon={<CheckCircle2 className="h-4 w-4" />}
              emptyMessage="Aucun ticket transmis"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-black uppercase tracking-widest text-[#212529] mb-6 flex items-center gap-2">
                <BellRing className="text-[#FF6D00]" />
                Commandes prêtes à servir
              </h2>

              {readyOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-16 rounded-2xl bg-white border border-[#E5E7EB]">
                  <div className="w-16 h-16 rounded-2xl bg-[#FF6D00]/5 flex items-center justify-center text-[#FF6D00] mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="font-extrabold text-[#212529] text-lg">Aucune alerte active</h3>
                  <p className="text-[#868e96] text-sm mt-1">Toutes les commandes prêtes ont été servies.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {readyOrders.map(order => (
                    <div 
                      key={order.id} 
                      className="border-2 border-[#FF6D00] rounded-2xl bg-white p-6 shadow-md animate-pulse flex flex-col justify-between"
                      style={{ animationDuration: '3s' }}
                    >
                      <div>
                        <div className="flex justify-between items-start border-b border-[#F8F9FA] pb-3 mb-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00] bg-[#FF6D00]/10 px-2 py-1 rounded-lg">
                              Alerte Prêt !
                            </span>
                            <h3 className="text-lg font-black text-[#212529] mt-2">COMMANDE #{order.id.slice(-4)}</h3>
                          </div>
                          {order.table && (
                            <span className="text-xl font-black text-[#FF6D00] bg-[#FF6D00]/10 border border-[#FF6D00]/25 rounded-xl px-4 py-2">
                              Table {order.table.number}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mb-6">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="font-medium text-[#212529]">
                                <span className="mr-2 font-black text-[#FF6D00]">{item.quantity}x</span>
                                {item.product.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleTransmit(order.id)}
                        className="w-full bg-[#FF6D00] hover:bg-[#E66200] text-white font-extrabold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
                      >
                        <Navigation size={16} />
                        Marquer servi & Transmettre à la caisse
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
