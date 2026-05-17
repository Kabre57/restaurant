'use client'

import React, { useEffect, useState } from 'react'
import { Clock, PackageCheck, Utensils } from 'lucide-react'

export type OrderStatus = 'EN_ATTENTE' | 'PREPARATION' | 'PRET' | 'COMPLETED' | 'CANCELLED'

export type KDSColumnOrder = {
  id: string
  status: OrderStatus
  createdAt: Date
  estimatedPrepMinutes?: number | null
  actualPrepMinutes?: number | null
  items: Array<{
    id: string
    quantity: number
    options: string | null
    product: { name: string }
  }>
  table?: { number: number } | null
}

function useElapsedSeconds(createdAt: Date): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const refreshElapsed = () => {
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
    }

    refreshElapsed()
    const id = setInterval(refreshElapsed, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  return elapsed
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function StatusCounter({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">{label}</span>
      <div className={`min-w-[40px] rounded-full px-4 py-1 text-center text-xs font-black text-white shadow-lg shadow-black/10 ${color}`}>
        {count}
      </div>
    </div>
  )
}

export function KDSColumn({ title, color, orders, onAction, icon, actionLabel }: {
  title: string
  color: string
  orders: KDSColumnOrder[]
  onAction?: (id: string, status: OrderStatus) => void
  icon?: React.ReactNode
  actionLabel?: string
}) {
  return (
    <div className="flex min-w-[320px] flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-[#dee2e6] bg-white shadow-xl sm:min-w-[360px] xl:min-w-[400px]">
      <div className="flex items-center justify-between p-6" style={{ backgroundColor: color }}>
        <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">{orders.length}</span>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-hide">
        {orders.map(order => (
          <OrderCard key={order.id} order={order} color={color} onAction={onAction} icon={icon} actionLabel={actionLabel} />
        ))}
        {orders.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-[#adb5bd] opacity-30">
            <Utensils className="h-12 w-12" />
            <span className="text-[10px] font-black uppercase tracking-widest">Aucune commande</span>
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order, color, onAction, icon, actionLabel }: {
  order: KDSColumnOrder
  color: string
  onAction?: (id: string, status: OrderStatus) => void
  icon?: React.ReactNode
  actionLabel?: string
}) {
  return (
    <div className="group space-y-4 rounded-3xl border border-[#dee2e6] bg-[#f8f9fa] p-5 transition-all hover:shadow-lg sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Commande</span>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-black tracking-tighter text-[#212529]">#{order.id.slice(-5).toUpperCase()}</h3>
            {order.table && (
              <div className="flex scale-110 items-center gap-2 rounded-xl bg-[#212529] px-4 py-1.5 text-white shadow-lg">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Table</span>
                <span className="text-xl font-black">{order.table.number}</span>
              </div>
            )}
          </div>
        </div>
        <Timer createdAt={order.createdAt} />
      </div>

      <PrepSummary order={order} />

      {onAction && actionLabel ? (
        <button
          onClick={() => onAction(order.id, order.status)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95"
          style={{ backgroundColor: color }}
        >
          {icon}
          {actionLabel}
        </button>
      ) : (
        <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#dee2e6] bg-white py-4 text-[10px] font-black uppercase tracking-widest text-[#2f9e44]">
          <PackageCheck className="h-5 w-5" />
          En attente du serveur
        </div>
      )}
    </div>
  )
}

function PrepSummary({ order }: { order: KDSColumnOrder }) {
  return (
    <div className="space-y-2">
      {(order.estimatedPrepMinutes || order.actualPrepMinutes) && (
        <div className="flex flex-wrap gap-2">
          {order.estimatedPrepMinutes && <PrepPill label="Estime" value={`~ ${order.estimatedPrepMinutes} min`} />}
          {order.actualPrepMinutes && <PrepPill label="Reel" value={`${order.actualPrepMinutes} min`} />}
        </div>
      )}
      {order.items.map(item => (
        <div key={item.id} className="rounded-xl border border-[#dee2e6] bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[#212529]">{item.product.name}</span>
            <span className="rounded-lg bg-[#f1f3f5] px-2 py-0.5 text-xs font-black">x{item.quantity}</span>
          </div>
          {item.options && (
            <p className="mt-2 rounded-lg border border-[#ffa8a8] bg-[#fff5f5] p-2 text-[10px] font-black uppercase tracking-widest text-[#e03131]">
              {item.options}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function PrepPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dee2e6] bg-white px-3 py-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">{label}</span>
      <p className="text-sm font-black text-[#212529]">{value}</p>
    </div>
  )
}

function Timer({ createdAt }: { createdAt: Date }) {
  const elapsed = useElapsedSeconds(createdAt)
  const isWarning = elapsed > 300
  const isCritical = elapsed > 600

  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-1 text-xs font-black ${isCritical ? 'border-[#ffa8a8] bg-[#fff5f5] text-[#e03131]' : isWarning ? 'border-[#ffe066] bg-[#fff9db] text-[#f08c00]' : 'border-[#dee2e6] bg-[#f1f3f5] text-[#495057]'}`}>
      <Clock className="h-3 w-3" />
      {formatTime(elapsed)}
    </div>
  )
}
