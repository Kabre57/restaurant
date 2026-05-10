'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Clock, ChefHat, AlertTriangle } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'

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

// ─── Chronomètre Utilitaire ──────────────────────────────────────────────────
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

// Priorité selon le temps (en secondes)
function getPriority(seconds: number): 'normal' | 'warning' | 'critical' {
  if (seconds >= 600) return 'critical'  // > 10 min
  if (seconds >= 300) return 'warning'   // > 5 min
  return 'normal'
}

// ─── Composant Principal ─────────────────────────────────────────────────────
export default function KDSClient({ initialOrders }: { initialOrders: Order[] }) {
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

    setOrders(prev => {
      if (nextStatus === 'COMPLETED') return prev.filter(o => o.id !== orderId)
      return prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o)
    })

    await updateOrderStatus(orderId, nextStatus)
  }

  const pendingOrders   = orders.filter(o => o.status === 'EN_ATTENTE')
  const preparingOrders = orders.filter(o => o.status === 'PRÉPARATION')
  const readyOrders     = orders.filter(o => o.status === 'PRÊT')

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10] text-white overflow-hidden">
      <header className="h-20 bg-[#14161b] border-b border-[#2a2e37] flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl font-bold tracking-tight text-white">Écran de Cuisine (KDS)</h1>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <StatusBadge color="red"     label={`À Préparer`}   count={pendingOrders.length} />
          <StatusBadge color="yellow"  label={`En Cours`}     count={preparingOrders.length} />
          <StatusBadge color="emerald" label={`Prêt`}         count={readyOrders.length} />
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-6 flex gap-6">
        <OrderColumn title="Nouvelles Commandes" color="red"     orders={pendingOrders}   onAction={handleUpdateStatus} actionLabel="Commencer" />
        <OrderColumn title="En Préparation"       color="yellow"  orders={preparingOrders} onAction={handleUpdateStatus} actionLabel="Terminer"   />
        <OrderColumn title="Prêt à Servir"        color="emerald" orders={readyOrders}     onAction={handleUpdateStatus} actionLabel="Retiré"     />
      </main>
    </div>
  )
}

// ─── Badge Statut Header ─────────────────────────────────────────────────────
function StatusBadge({ color, label, count }: { color: 'red' | 'yellow' | 'emerald', label: string, count: number }) {
  const dotColors = { red: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]', yellow: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]', emerald: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' }
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${dotColors[color]}`} />
      <span>{label} ({count})</span>
    </div>
  )
}

// ─── Colonne de Commandes ─────────────────────────────────────────────────────
function OrderColumn({ title, color, orders, onAction, actionLabel }: {
  title: string
  color: 'red' | 'yellow' | 'emerald'
  orders: Order[]
  onAction: (id: string, s: OrderStatus) => void
  actionLabel: string
}) {
  const headerColors = {
    red:     'border-red-500/50 bg-red-500/10 text-red-400',
    yellow:  'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  }

  return (
    <div className="flex-1 min-w-[350px] max-w-[450px] bg-[#14161b] rounded-2xl border border-[#2a2e37] flex flex-col overflow-hidden shadow-xl">
      <div className={`p-4 border-b border-[#2a2e37] flex justify-between items-center ${headerColors[color]}`}>
        <h2 className="font-bold text-lg">{title}</h2>
        <span className="font-bold bg-black/20 px-3 py-1 rounded-full text-sm">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
        {orders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic">Aucune commande</div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id} order={order} color={color} onAction={onAction} actionLabel={actionLabel} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Carte de Commande avec Chronomètre ──────────────────────────────────────
function OrderCard({ order, color, onAction, actionLabel }: {
  order: Order
  color: 'red' | 'yellow' | 'emerald'
  onAction: (id: string, s: OrderStatus) => void
  actionLabel: string
}) {
  const elapsed   = useElapsedSeconds(order.createdAt)
  const priority  = getPriority(elapsed)

  // Styles dynamiques selon la priorité
  const cardBorder = {
    normal:   'border-[#2a2e37]',
    warning:  'border-orange-500/60',
    critical: 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
  }[priority]

  const timerColors = {
    normal:   'text-gray-400 bg-[#2a2e37]',
    warning:  'text-orange-400 bg-orange-500/10 border border-orange-500/30',
    critical: 'text-red-400 bg-red-500/10 border border-red-500/40 animate-pulse',
  }[priority]

  const btnColors = {
    red:     'bg-red-500 hover:bg-red-400 text-white',
    yellow:  'bg-yellow-500 hover:bg-yellow-400 text-black',
    emerald: 'bg-emerald-500 hover:bg-emerald-400 text-white',
  }[color]

  return (
    <div className={`bg-[#1a1d24] rounded-xl border ${cardBorder} p-4 shadow-lg flex flex-col gap-4 transition-all duration-500`}>
      {/* En-tête de la carte */}
      <div className="flex justify-between items-start border-b border-[#2a2e37] pb-3">
        <div>
          <div className="font-bold text-xl text-white">#{order.id.slice(-4).toUpperCase()}</div>
          <div className="text-sm text-gray-400 mt-1">
            {order.type === 'DINE_IN' ? '🪑 Sur place' : '📦 À emporter'}
          </div>
        </div>

        {/* Chronomètre avec indicateur de priorité */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${timerColors}`}>
          {priority === 'critical' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          <span>{formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Articles */}
      <ul className="space-y-3">
        {order.items.map((item, idx) => (
          <li key={idx} className="flex gap-3 text-gray-200">
            <span className="font-bold text-white bg-[#2a2e37] w-7 h-7 flex items-center justify-center rounded shrink-0">
              {item.quantity}
            </span>
            <div>
              <span className="font-medium text-lg leading-tight block">{item.product.name}</span>
              {item.options && (
                <span className="text-sm text-red-400 mt-0.5 block">⚠ {item.options}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Bouton d'action */}
      <button
        onClick={() => onAction(order.id, order.status)}
        className={`w-full py-3 rounded-lg font-bold transition-all active:scale-95 hover:brightness-110 ${btnColors}`}
      >
        {actionLabel}
      </button>
    </div>
  )
}
