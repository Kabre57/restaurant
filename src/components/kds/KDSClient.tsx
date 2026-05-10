'use client'

import React, { useEffect, useState } from 'react'
import { Clock, ArrowLeft, Check, Play, PackageCheck, Utensils, LayoutGrid, Settings } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import Link from 'next/link'

type OrderStatus = 'EN_ATTENTE' | 'PRÉPARATION' | 'PRÊT' | 'COMPLETED' | 'CANCELLED'

type OrderItem = {
  id: string
  quantity: number
  options: string | null
  product: { name: string }
}

type Order = {
  id: string
  status: OrderStatus
  type: string
  createdAt: Date
  items: OrderItem[]
}

function useElapsedSeconds(createdAt: Date): number {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  )
  useEffect(() => {
    const id = setInterval(() =>
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
    , 1000)
    return () => clearInterval(id)
  }, [createdAt])
  return elapsed
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function KDSClient({ initialOrders, storeName }: { initialOrders: Order[], storeName: string }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)

  useEffect(() => {
    const eventSource = new EventSource('/api/kds/stream')

    eventSource.addEventListener('new-order', (event) => {
      const newOrder = JSON.parse(event.data)
      setOrders(prev => [...prev, newOrder])
    })

    eventSource.addEventListener('order-updated', (event) => {
      const updatedOrder = JSON.parse(event.data)
      setOrders(prev => {
        if (updatedOrder.status === 'COMPLETED' || updatedOrder.status === 'CANCELLED') {
          return prev.filter(o => o.id !== updatedOrder.id)
        }
        const exists = prev.find(o => o.id === updatedOrder.id)
        if (exists) {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
        }
        return [...prev, updatedOrder]
      })
    })

    return () => { eventSource.close() }
  }, [])

  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'PRÉPARATION'
    if (currentStatus === 'PRÉPARATION') nextStatus = 'PRÊT'
    if (currentStatus === 'PRÊT') nextStatus = 'COMPLETED'

    try {
      const res = await updateOrderStatus(orderId, nextStatus)
      if (res.success) {
        setOrders(prev => {
          if (nextStatus === 'COMPLETED') return prev.filter(o => o.id !== orderId)
          return prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o)
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'EN_ATTENTE')
  const preparingOrders = orders.filter(o => o.status === 'PRÉPARATION')
  const readyOrders = orders.filter(o => o.status === 'PRÊT')

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-[#212529] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-20 bg-white border-r border-[#dee2e6] flex flex-col items-center py-8 gap-10 shadow-sm z-20">
        <div className="w-12 h-12 bg-[#212529] rounded-2xl flex items-center justify-center shadow-lg">
          <Utensils className="text-white w-6 h-6" />
        </div>
        <Link href="/" className="p-4 hover:bg-[#f1f3f5] rounded-2xl transition-all text-[#adb5bd] hover:text-[#212529]">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="p-4 bg-[#f1f3f5] rounded-2xl text-[#212529]">
          <LayoutGrid className="w-6 h-6" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-20 px-10 flex items-center justify-between bg-white border-b border-[#dee2e6] z-10 shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Affichage Cuisine</h1>
              <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">{storeName}</span>
            </div>
            <div className="h-8 w-px bg-[#dee2e6]" />
            <div className="flex items-center gap-4">
              <StatusCounter label="À PRÉPARER" count={pendingOrders.length} color="bg-[#e03131]" />
              <StatusCounter label="EN COURS" count={preparingOrders.length} color="bg-[#f08c00]" />
              <StatusCounter label="PRÊT" count={readyOrders.length} color="bg-[#2f9e44]" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Temps Réel</span>
              <span className="text-xs font-bold uppercase tracking-widest">{new Date().toLocaleTimeString('fr-FR')}</span>
            </div>
          </div>
        </header>

        {/* Columns */}
        <div className="flex-1 overflow-x-auto p-8 flex gap-8 bg-[#f1f3f5]">
          <KDSColumn 
            title="Nouvelles Commandes" 
            color="#e03131" 
            orders={pendingOrders} 
            onAction={handleUpdateStatus} 
            icon={<Play className="w-5 h-5" />} 
            actionLabel="COMMENCER" 
          />
          <KDSColumn 
            title="En Préparation" 
            color="#f08c00" 
            orders={preparingOrders} 
            onAction={handleUpdateStatus} 
            icon={<Check className="w-5 h-5" />} 
            actionLabel="TERMINER" 
          />
          <KDSColumn 
            title="Prêt / À Servir" 
            color="#2f9e44" 
            orders={readyOrders} 
            onAction={handleUpdateStatus} 
            icon={<PackageCheck className="w-5 h-5" />} 
            actionLabel="LIVRER" 
          />
        </div>
      </main>
    </div>
  )
}

function StatusCounter({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mb-1">{label}</span>
      <div className={`px-4 py-1 ${color} text-white rounded-full text-xs font-black min-w-[40px] text-center shadow-lg shadow-black/10`}>
        {count}
      </div>
    </div>
  )
}

function KDSColumn({ title, color, orders, onAction, icon, actionLabel }: {
  title: string
  color: string
  orders: Order[]
  onAction: (id: string, s: OrderStatus) => void
  icon: React.ReactNode
  actionLabel: string
}) {
  return (
    <div className="flex-1 min-w-[400px] flex flex-col bg-white rounded-[2.5rem] overflow-hidden border border-[#dee2e6] shadow-xl">
      <div className="p-6 flex justify-between items-center" style={{ backgroundColor: color }}>
        <h2 className="text-sm font-black text-white tracking-widest uppercase">{title}</h2>
        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-black">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {orders.map(order => (
          <div key={order.id} className="bg-[#f8f9fa] rounded-3xl p-6 border border-[#dee2e6] space-y-4 hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Commande</span>
                <h3 className="text-xl font-black text-[#212529] tracking-tighter">#{order.id.slice(-5).toUpperCase()}</h3>
              </div>
              <Timer createdAt={order.createdAt} />
            </div>
            
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#dee2e6]">
                  <span className="text-xs font-black text-[#212529] uppercase">{item.product.name}</span>
                  <span className="text-xs font-black bg-[#f1f3f5] px-2 py-0.5 rounded-lg">x{item.quantity}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onAction(order.id, order.status)}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-lg active:scale-95"
              style={{ backgroundColor: color }}
            >
              {icon}
              {actionLabel}
            </button>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-[#adb5bd] gap-4 opacity-30">
            <Utensils className="w-12 h-12" />
            <span className="text-[10px] font-black uppercase tracking-widest">Aucune commande</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Timer({ createdAt }: { createdAt: Date }) {
  const elapsed = useElapsedSeconds(createdAt)
  const isWarning = elapsed > 300
  const isCritical = elapsed > 600

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border font-black text-xs ${isCritical ? 'bg-[#fff5f5] border-[#ffa8a8] text-[#e03131]' : isWarning ? 'bg-[#fff9db] border-[#ffe066] text-[#f08c00]' : 'bg-[#f1f3f5] border-[#dee2e6] text-[#495057]'}`}>
      <Clock className="w-3 h-3" />
      {formatTime(elapsed)}
    </div>
  )
}
