'use client'

import React, { useEffect, useState } from 'react'
import { Clock, PackageCheck, ChefHat } from 'lucide-react'

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
  // Map colors for better aesthetic while keeping the logic
  const bgColors: Record<string, string> = {
    'bg-[#FF6D00]': 'bg-[#FF6D00]/10 border-[#FF6D00]/20 text-[#FF6D00]',
    'bg-[#212529]': 'bg-[#212529]/10 border-[#212529]/20 text-[#212529]',
    'bg-[#868e96]': 'bg-[#F8F9FA] border-[#E5E7EB] text-[#868e96]',
  }
  const appliedClass = bgColors[color] || 'bg-[#F8F9FA] border-[#E5E7EB] text-[#868e96]'

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border ${appliedClass}`}>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-lg bg-white text-[10px] font-black shadow-sm`}>
        {count}
      </span>
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
    <div className="flex w-full min-w-[320px] max-w-sm flex-col rounded-2xl bg-[#F8F9FA] shadow-sm border border-[#E5E7EB]">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] p-4 bg-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6D00]/10 text-[#FF6D00]">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">{title}</h2>
            <p className="text-[10px] font-medium text-[#868e96]">Tickets en cours</p>
          </div>
        </div>
        <div className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-[#F8F9FA] px-2 text-[10px] font-black text-[#868e96] border border-[#E5E7EB]">
          {orders.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[#868e96]">
            <div className="mb-3 rounded-2xl bg-white p-4 border border-[#E5E7EB]">
              <PackageCheck className="h-6 w-6 text-[#adb5bd]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Aucune commande</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} color={color} onAction={onAction} icon={icon} actionLabel={actionLabel} />
            ))}
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
    <div className="group flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:border-[#FF6D00] hover:shadow-md">
      <div className="flex items-center justify-between border-b border-[#F8F9FA] pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-[#212529] px-2 py-1 text-[10px] font-black text-white">
            #{order.id.slice(-4)}
          </span>
          {order.table && (
            <span className="rounded-lg bg-[#FF6D00]/10 px-2 py-1 text-[10px] font-black text-[#FF6D00] border border-[#FF6D00]/20">
              Table {order.table.number}
            </span>
          )}
        </div>
        <Timer createdAt={order.createdAt} />
      </div>

      <PrepSummary order={order} />

      {onAction && actionLabel ? (
        <button
          onClick={() => onAction(order.id, order.status)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 shadow-sm"
          style={{ backgroundColor: color }}
        >
          {icon}
          {actionLabel}
        </button>
      ) : (
        <div className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 py-2.5 text-[10px] font-black uppercase tracking-widest text-green-600">
          <PackageCheck className="h-4 w-4" />
          En attente du serveur
        </div>
      )}
    </div>
  )
}

function PrepSummary({ order }: { order: KDSColumnOrder }) {
  return (
    <div className="flex flex-col gap-2">
      {order.items.map(item => (
        <div key={item.id} className="flex flex-col text-xs">
          <div className="flex justify-between">
            <span className="font-medium text-[#212529]">
              <span className="mr-2 font-black text-[#FF6D00]">{item.quantity}x</span>
              {item.product.name}
            </span>
          </div>
          {item.options && (
            <span className="text-[10px] font-medium text-[#868e96] ml-6 mt-0.5">
              • {item.options}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function Timer({ createdAt }: { createdAt: Date }) {
  const elapsed = useElapsedSeconds(createdAt)
  const isWarning = elapsed > 300
  const isCritical = elapsed > 600

  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold ${isCritical ? 'text-[#FF6D00]' : isWarning ? 'text-[#FF6D00]/70' : 'text-[#868e96]'}`}>
      <Clock className="h-3.5 w-3.5" />
      <span>{formatTime(elapsed)}</span>
    </div>
  )
}
