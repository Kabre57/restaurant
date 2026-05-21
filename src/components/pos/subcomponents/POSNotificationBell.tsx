'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, AlertTriangle, Utensils, BellRing, X } from 'lucide-react'

type NotifType = 'ORDER_READY' | 'STOCK_ALERT' | 'SERVER_CALL' | 'ORDER_CREATED'

interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  timestamp: Date
  read: boolean
}

function getNotifIcon(type: NotifType) {
  switch (type) {
    case 'ORDER_READY': return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'STOCK_ALERT': return <AlertTriangle className="h-4 w-4 text-amber-500" />
    case 'SERVER_CALL': return <BellRing className="h-4 w-4 text-blue-500" />
    case 'ORDER_CREATED': return <Utensils className="h-4 w-4 text-[#FF6D00]" />
  }
}

function getNotifBg(type: NotifType) {
  switch (type) {
    case 'ORDER_READY': return 'bg-green-50 border-green-200'
    case 'STOCK_ALERT': return 'bg-amber-50 border-amber-200'
    case 'SERVER_CALL': return 'bg-blue-50 border-blue-200'
    case 'ORDER_CREATED': return 'bg-[#FF6D00]/5 border-[#FF6D00]/20'
  }
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a F CFA {Math.floor(diff / 60)} min`
  return `Il y a F CFA {Math.floor(diff / 3600)}h`
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

interface POSNotificationBellProps {
  storeId: string
}

export function POSNotificationBell({ storeId }: POSNotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const push = useCallback((notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications((prev) => [
      { ...notif, id: uid(), timestamp: new Date(), read: false },
      ...prev,
    ].slice(0, 20)) // keep max 20
  }, [])

  // SSE: stock alerts
  useEffect(() => {
    if (!storeId) return
    const src = new EventSource(`/api/stock/alerts?storeId=F CFA {encodeURIComponent(storeId)}`)
    src.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { name: string; stockQuantity: number }
        push({
          type: 'STOCK_ALERT',
          title: 'Alerte stock bas',
          message: `F CFA {data.name} — F CFA {data.stockQuantity} unité(s) restante(s)`,
        })
      } catch { }
    }
    return () => src.close()
  }, [storeId, push])

  // SSE: KDS order stream (ORDER_READY + ORDER_CREATED)
  useEffect(() => {
    if (!storeId) return
    const src = new EventSource(`/api/kds/stream?storeId=F CFA {encodeURIComponent(storeId)}`)

    const handleOrderReady = (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data) as { table?: { number: number } | null; status?: string }
        if (order.status === 'PRET') {
          push({
            type: 'ORDER_READY',
            title: '✅ Commande prête',
            message: order.table?.number
              ? `La commande de la Table F CFA {order.table.number} est prête à servir.`
              : 'Une commande est prête à servir.',
          })
        }
      } catch { }
    }

    const handleOrderCreated = (e: MessageEvent) => {
      try {
        const order = JSON.parse(e.data) as { table?: { number: number } | null }
        push({
          type: 'ORDER_CREATED',
          title: '🍽️ Nouvelle commande',
          message: order.table?.number
            ? `Commande reçue pour la Table F CFA {order.table.number}.`
            : 'Nouvelle commande reçue.',
        })
      } catch { }
    }

    src.addEventListener('order-updated', handleOrderReady as EventListener)
    src.addEventListener('new-order', handleOrderCreated as EventListener)
    return () => src.close()
  }, [storeId, push])

  // SSE: POS alerts (server calls)
  useEffect(() => {
    if (!storeId) return
    const src = new EventSource(`/api/pos/alerts?storeId=F CFA {encodeURIComponent(storeId)}`)

    src.addEventListener('server-call', (e: Event) => {
      const msgEvent = e as MessageEvent
      try {
        const data = JSON.parse(msgEvent.data) as { tableNumber?: number; customerName?: string }
        push({
          type: 'SERVER_CALL',
          title: '🔔 Appel serveur',
          message: data.tableNumber
            ? `La Table F CFA {data.tableNumber} appelle un serveur.`
            : 'Un client appelle un serveur.',
        })
      } catch { }
    })
    return () => src.close()
  }, [storeId, push])

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setIsOpen((v) => !v); if (!isOpen) markAllRead() }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all F CFA {
          unreadCount > 0
            ? 'border-[#FF6D00]/30 bg-[#FF6D00]/5 text-[#FF6D00] hover:bg-[#FF6D00]/10'
            : 'border-[#E5E7EB] bg-[#F8F9FA] text-[#212529] hover:bg-[#F1F3F5]'
        }`}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4 animate-[wiggle_0.5s_ease-in-out]" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl shadow-black/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[#F1F3F5] px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#868e96]">Centre d'alertes</p>
              <h3 className="text-sm font-black text-[#212529]">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={() => setNotifications([])}
                  className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd] hover:text-red-500 transition-colors"
                >
                  Effacer tout
                </button>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8F9FA] mb-3">
                  <Bell className="h-5 w-5 text-[#adb5bd]" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Aucune notification</p>
                <p className="text-[9px] font-semibold text-[#adb5bd] mt-1">
                  Les alertes cuisine, stock et appels serveur apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`relative flex items-start gap-3 rounded-xl border p-3 F CFA {getNotifBg(notif.type)}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-[#212529] leading-tight">{notif.title}</p>
                      <p className="text-[9px] font-semibold text-[#868e96] mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[8px] font-bold text-[#adb5bd] mt-1 uppercase tracking-widest">
                        {formatRelative(notif.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(notif.id)}
                      className="shrink-0 text-[#adb5bd] hover:text-[#868e96] transition-colors mt-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Type legend */}
          <div className="border-t border-[#F1F3F5] px-4 py-3">
            <div className="flex flex-wrap gap-3">
              {([
                ['ORDER_READY', 'Commande prête'],
                ['SERVER_CALL', 'Appel serveur'],
                ['STOCK_ALERT', 'Stock bas'],
                ['ORDER_CREATED', 'Nouvelle commande'],
              ] as [NotifType, string][]).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1">
                  {getNotifIcon(type)}
                  <span className="text-[8px] font-bold text-[#868e96] uppercase tracking-widest">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
