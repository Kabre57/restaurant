'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Clock, ArrowLeft, Check, Play, PackageCheck, Utensils, LayoutGrid, Radio, Menu, X, LogOut, BellRing } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

type OrderStatus = 'EN_ATTENTE' | 'PREPARATION' | 'PRET' | 'COMPLETED' | 'CANCELLED'
type StreamStatus = 'connecting' | 'connected' | 'reconnecting'

type OrderItem = {
  id: string
  quantity: number
  options: string | null
  product: { 
    name: string
    category: { name: string }
  }
}

export type KDSOrder = {
  id: string
  status: string
  storeId: string
  type: string
  createdAt: Date
  estimatedPrepMinutes?: number | null
  estimatedReadyAt?: Date | string | null
  actualPrepMinutes?: number | null
  preparationStartedAt?: Date | string | null
  readyAt?: Date | string | null
  items: OrderItem[]
  table?: { number: number } | null
}

type Order = Omit<KDSOrder, 'status'> & { status: OrderStatus }

type ServerCallAlert = {
  tableId: string
  tableNumber?: number
  timestamp: string
}

function normalizeStatus(status: string): OrderStatus {
  if (status === 'PRÉPARATION' || status === 'PREPARATION') return 'PREPARATION'
  if (status === 'PRÊT' || status === 'PRET') return 'PRET'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELLED') return 'CANCELLED'
  return 'EN_ATTENTE'
}

function normalizeOrder(order: KDSOrder): Order {
  return {
    ...order,
    status: normalizeStatus(order.status),
  }
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
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function KDSClient({ initialOrders, storeId, storeName }: { initialOrders: KDSOrder[], storeId: string, storeName: string }) {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>(() => initialOrders.map(normalizeOrder))
  const [prepZone, setPrepZone] = useState<'ALL' | 'CUISINE' | 'BAR'>('ALL')
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting')
  const [retryDelay, setRetryDelay] = useState(1000)
  const [currentTime, setCurrentTime] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [serverCalls, setServerCalls] = useState<ServerCallAlert[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let stopped = false

    function connectToStream(attempt = 0) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      eventSourceRef.current?.close()
      setStreamStatus(attempt === 0 ? 'connecting' : 'reconnecting')

      const eventSource = new EventSource(`/api/kds/stream?storeId=${encodeURIComponent(storeId)}&station=${prepZone}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setStreamStatus('connected')
        setRetryDelay(1000)
      }

      eventSource.addEventListener('new-order', (event) => {
        const newOrder = normalizeOrder(JSON.parse(event.data))
        if (newOrder.storeId !== storeId) return

        setOrders(prev => {
          const exists = prev.some(order => order.id === newOrder.id)
          return exists ? prev.map(order => order.id === newOrder.id ? newOrder : order) : [...prev, newOrder]
        })
      })

      eventSource.addEventListener('order-updated', (event) => {
        const updatedOrder = normalizeOrder(JSON.parse(event.data))
        if (updatedOrder.storeId !== storeId) return

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

      eventSource.addEventListener('heartbeat', () => {
        setStreamStatus('connected')
      })

      eventSource.addEventListener('server-call', (event) => {
        const call = JSON.parse(event.data) as ServerCallAlert
        setServerCalls(prev => [call, ...prev.filter(item => item.tableId !== call.tableId)].slice(0, 4))
      })

      eventSource.onerror = () => {
        eventSource.close()
        if (stopped) return

        const delay = Math.min(30000, 1000 * 2 ** attempt)
        setRetryDelay(delay)
        setStreamStatus('reconnecting')
        reconnectTimerRef.current = setTimeout(() => connectToStream(attempt + 1), delay)
      }
    }

    connectToStream()

    return () => {
      stopped = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      eventSourceRef.current?.close()
    }
  }, [storeId, prepZone])

  useEffect(() => {
    const refreshClock = () => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR'))
    }

    refreshClock()
    const interval = setInterval(refreshClock, 1000)
    return () => clearInterval(interval)
  }, [])

  const streamLabel = streamStatus === 'connected'
    ? 'Flux connecté'
    : streamStatus === 'connecting'
      ? 'Connexion flux'
      : `Reconnexion ${Math.ceil(retryDelay / 1000)}s`

  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    if (currentStatus === 'PRET') return

    let nextStatus: OrderStatus = 'PREPARATION'
    if (currentStatus === 'PREPARATION') nextStatus = 'PRET'

    try {
      const res = await updateOrderStatus(orderId, nextStatus, storeId)
      if (res.success) {
        setOrders(prev => {
          return prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o)
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogout = async () => {
    setIsSidebarOpen(false)
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()
  }

  const processedOrders = orders.map(order => {
    const filteredItems = order.items.filter(item => {
      if (prepZone === 'ALL') return true
      const isDrink = item.product.category?.name.toLowerCase().includes('boisson') || false
      return prepZone === 'CUISINE' ? !isDrink : isDrink
    })
    return { ...order, items: filteredItems }
  }).filter(order => order.items.length > 0)

  const pendingOrders = processedOrders.filter(o => o.status === 'EN_ATTENTE')
  const preparingOrders = processedOrders.filter(o => o.status === 'PREPARATION')
  const readyOrders = processedOrders.filter(o => o.status === 'PRET')

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] text-[#212529] font-sans overflow-hidden xl:h-screen">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f1115]/55 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[16rem] max-w-[84vw] flex-col gap-8 border-r border-[#dee2e6] bg-white px-4 py-6 shadow-sm transition-transform duration-300 lg:static lg:w-20 lg:max-w-none lg:translate-x-0 lg:items-center lg:px-0 lg:py-8 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between lg:flex-col lg:gap-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#212529] shadow-lg">
            <Utensils className="h-6 w-6 text-white" />
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-[#adb5bd] transition-all hover:bg-[#f1f3f5] hover:text-[#212529] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:items-center">
          <Link href="/" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#495057] transition-all hover:bg-[#f1f3f5] hover:text-[#212529] lg:flex-col lg:px-2 lg:text-[8px]">
            <ArrowLeft className="h-5 w-5" />
            <span className="lg:hidden xl:block">Retour POS</span>
          </Link>
          <div className="flex items-center gap-3 rounded-2xl bg-[#f1f3f5] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#212529] lg:flex-col lg:px-2 lg:text-[8px]">
            <LayoutGrid className="h-5 w-5" />
            <span className="lg:hidden xl:block">Cuisine</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 lg:items-center">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#adb5bd] transition-all hover:bg-[#fff5f5] hover:text-[#e03131] lg:flex-col lg:px-2 lg:text-[8px]"
          >
            <LogOut className="h-5 w-5" />
            <span className="lg:hidden xl:block">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-[#dee2e6] bg-white px-4 py-4 z-10 shadow-sm md:px-6 lg:px-10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-start gap-4 xl:items-center xl:gap-6">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] text-[#212529] transition-all hover:bg-[#f1f3f5] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#212529] uppercase tracking-tighter">Affichage Cuisine</h1>
              <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mt-1">{storeName}</p>
            </div>
            <div className="flex overflow-x-auto bg-[#f1f3f5] p-1 rounded-xl border border-[#e9ecef] no-scrollbar">
              <button 
                onClick={() => setPrepZone('ALL')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${prepZone === 'ALL' ? 'bg-[#212529] text-white shadow-lg' : 'text-[#adb5bd] hover:text-[#212529]'}`}
              >
                Tout
              </button>
              <button 
                onClick={() => setPrepZone('CUISINE')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${prepZone === 'CUISINE' ? 'bg-[#212529] text-white shadow-lg' : 'text-[#adb5bd] hover:text-[#212529]'}`}
              >
                Cuisine
              </button>
              <button 
                onClick={() => setPrepZone('BAR')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${prepZone === 'BAR' ? 'bg-[#212529] text-white shadow-lg' : 'text-[#adb5bd] hover:text-[#212529]'}`}
              >
                Bar
              </button>
            </div>
            <div className="hidden h-8 w-px bg-[#dee2e6] xl:block" />
            <div className="flex flex-wrap items-center gap-4">
              <StatusCounter label="À PRÉPARER" count={pendingOrders.length} color="bg-[#e03131]" />
              <StatusCounter label="EN COURS" count={preparingOrders.length} color="bg-[#f08c00]" />
              <StatusCounter label="PRÊT" count={readyOrders.length} color="bg-[#2f9e44]" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 xl:justify-end">
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
              streamStatus === 'connected'
                ? 'border-[#b2f2bb] bg-[#ebfbee] text-[#2f9e44]'
                : 'border-[#ffe066] bg-[#fff9db] text-[#f08c00]'
            }`}>
              <Radio className={`h-4 w-4 ${streamStatus !== 'connected' ? 'animate-pulse' : ''}`} />
              {streamLabel}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Temps Réel</span>
              <span className="text-xs font-bold uppercase tracking-widest">{currentTime || '--:--:--'}</span>
            </div>
          </div>
          </div>
        </header>

        {serverCalls.length > 0 && (
          <div className="border-b border-[#ffd43b] bg-[#fff9db] px-4 py-3 md:px-6 lg:px-10">
            <div className="flex flex-wrap items-center gap-3">
              {serverCalls.map(call => (
                <div key={`${call.tableId}-${call.timestamp}`} className="flex items-center gap-3 rounded-xl border border-[#fcc419] bg-white px-4 py-2 text-[#f08c00] shadow-sm">
                  <BellRing className="h-4 w-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Appel serveur {call.tableNumber ? `Table ${call.tableNumber}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServerCalls(prev => prev.filter(item => item.tableId !== call.tableId))}
                    className="rounded-lg p-1 text-[#adb5bd] hover:bg-[#f1f3f5] hover:text-[#212529]"
                    aria-label="Masquer l'appel serveur"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-x-auto bg-[#f1f3f5] p-4 sm:p-6 lg:p-8 flex gap-6 lg:gap-8">
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
  onAction?: (id: string, s: OrderStatus) => void
  icon?: React.ReactNode
  actionLabel?: string
}) {
  return (
    <div className="flex min-w-[320px] flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-[#dee2e6] bg-white shadow-xl sm:min-w-[360px] xl:min-w-[400px]">
      <div className="p-6 flex justify-between items-center" style={{ backgroundColor: color }}>
        <h2 className="text-sm font-black text-white tracking-widest uppercase">{title}</h2>
        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-black">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {orders.map(order => (
          <div key={order.id} className="group space-y-4 rounded-3xl border border-[#dee2e6] bg-[#f8f9fa] p-5 transition-all hover:shadow-lg sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Commande</span>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-black text-[#212529] tracking-tighter">
                    #{order.id.slice(-5).toUpperCase()}
                  </h3>
                  {order.table && (
                    <div className="bg-[#212529] text-white px-4 py-1.5 rounded-xl flex items-center gap-2 shadow-lg scale-110">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Table</span>
                      <span className="text-xl font-black">{order.table.number}</span>
                    </div>
                  )}
                </div>
              </div>
              <Timer createdAt={order.createdAt} />
            </div>
            
            <div className="space-y-2">
              {(order.estimatedPrepMinutes || order.actualPrepMinutes) && (
                <div className="flex flex-wrap gap-2">
                  {order.estimatedPrepMinutes && (
                    <div className="bg-white px-3 py-2 rounded-xl border border-[#dee2e6]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Estime</span>
                      <p className="text-sm font-black text-[#212529]">~ {order.estimatedPrepMinutes} min</p>
                    </div>
                  )}
                  {order.actualPrepMinutes && (
                    <div className="bg-white px-3 py-2 rounded-xl border border-[#dee2e6]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Reel</span>
                      <p className="text-sm font-black text-[#212529]">{order.actualPrepMinutes} min</p>
                    </div>
                  )}
                </div>
              )}
              {order.items.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-xl border border-[#dee2e6]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[#212529] uppercase">{item.product.name}</span>
                    <span className="text-xs font-black bg-[#f1f3f5] px-2 py-0.5 rounded-lg">x{item.quantity}</span>
                  </div>
                  {item.options && (
                    <p className="text-[10px] font-black text-[#e03131] uppercase tracking-widest mt-2 bg-[#fff5f5] p-2 rounded-lg border border-[#ffa8a8]">
                      ⚠️ {item.options}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {onAction && actionLabel ? (
              <button
                onClick={() => onAction(order.id, order.status)}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-lg active:scale-95"
                style={{ backgroundColor: color }}
              >
                {icon}
                {actionLabel}
              </button>
            ) : (
              <div className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border border-[#dee2e6] bg-white text-[#2f9e44]">
                <PackageCheck className="w-5 h-5" />
                En attente du serveur
              </div>
            )}
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
