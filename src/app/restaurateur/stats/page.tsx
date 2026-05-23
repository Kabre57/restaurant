'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getStoreOrders } from '@/app/actions/orders'
import { useSession } from 'next-auth/react'
import { Loader2, TrendingUp, DollarSign, ShoppingBag, Calendar, ArrowUpRight } from 'lucide-react'
import { format } from 'date-fns'

type StatsOrder = {
  id: string
  status: string
  total: number
  createdAt: Date | string
  items?: { quantity: number; product: { name: string } }[]
}

// ─── Graphe SVG natif (sans recharts) ────────────────────────────────────────

function HourlyBarChart({ orders }: { orders: StatsOrder[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const data = useMemo(() => {
    const totals = new Array(24).fill(0)
    orders.forEach((o) => {
      const h = new Date(o.createdAt).getHours()
      totals[h] += o.total
    })
    return totals
  }, [orders])

  const maxVal = Math.max(...data, 1)
  const W = 700
  const H = 140
  const barW = W / 24 - 4
  const labelEvery = 4

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full min-w-[500px]" aria-label="Revenus par heure">
        {data.map((val, h) => {
          const barH = val > 0 ? Math.max(4, (val / maxVal) * H) : 2
          const x = h * (W / 24) + 2
          const y = H - barH
          const isActive = val > 0
          return (
            <g key={h}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={isActive ? '#FF6D00' : '#E5E7EB'}
                opacity={isActive ? 1 : 0.5}
              />
              {h % labelEvery === 0 && (
                <text x={x + barW / 2} y={H + 18} textAnchor="middle" fontSize={10} fill="#adb5bd" fontWeight="700">
                  {String(h).padStart(2, '0')}h
                </text>
              )}
              {val > 0 && barH > 20 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="#FF6D00" fontWeight="900">
                  {Math.round(val / 1000)}k
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Top produits ─────────────────────────────────────────────────────────────

function TopProducts({ orders }: { orders: StatsOrder[] }) {
  const products = useMemo(() => {
    const counts: Record<string, { name: string; count: number; revenue: number }> = {}
    orders.forEach((o) => {
      o.items?.forEach((item) => {
        if (!counts[item.product.name]) {
          counts[item.product.name] = { name: item.product.name, count: 0, revenue: 0 }
        }
        counts[item.product.name].count += item.quantity
      })
    })
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [orders])

  const maxCount = Math.max(...products.map((p) => p.count), 1)

  if (products.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-[#adb5bd] gap-3">
      <TrendingUp className="w-10 h-10 opacity-20" />
      <p className="text-xs font-black uppercase tracking-widest">Pas encore de données</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <div key={p.name} className="flex items-center gap-4">
          <span className="text-[10px] font-black text-[#adb5bd] w-5 shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[#212529] truncate">{p.name}</p>
            <div className="mt-1 h-1.5 bg-[#F8F9FA] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF6D00] rounded-full transition-all duration-700"
                style={{ width: `${(p.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-black text-[#FF6D00] shrink-0">{p.count} ventes</span>
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function RestaurateurStats() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<StatsOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return
    const activeStoreId = storeId
    let isCancelled = false

    async function fetchStats() {
      setLoading(true)
      const data = await getStoreOrders(activeStoreId)
      if (isCancelled) return
      setOrders(data as StatsOrder[])
      setLoading(false)
    }

    void fetchStats()
    return () => { isCancelled = true }
  }, [session?.user?.storeId])

  const completedOrders = orders.filter((o) => o.status !== 'CANCELLED')
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
  const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

  const targetDate = new Date(selectedDate)
  targetDate.setHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const dateOrders = completedOrders.filter((o) => {
    const d = new Date(o.createdAt)
    return d >= targetDate && d <= endOfDay
  })
  const dateRevenue = dateOrders.reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Performance</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Tableau de bord et indicateurs clés</p>
        </div>
        <div className="flex w-full items-center gap-4 rounded-2xl border border-[#dee2e6] bg-white px-5 py-3 shadow-sm sm:w-auto sm:px-6">
          <Calendar className="w-5 h-5 text-[#adb5bd]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Période d&apos;analyse</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-black text-[#212529] uppercase tracking-widest focus:outline-none bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Chiffre d'affaires", value: `${totalRevenue.toLocaleString()} FCFA`, icon: DollarSign, color: '#2f9e44', bg: '#ebfbee' },
              { label: 'Total Commandes', value: completedOrders.length.toString(), icon: ShoppingBag, color: '#1c7ed6', bg: '#e7f5ff' },
              { label: 'Panier Moyen', value: `${Math.round(averageOrderValue).toLocaleString()} FCFA`, icon: TrendingUp, color: '#845ef7', bg: '#f3f0ff' },
              { label: 'Recettes du jour', value: `${dateRevenue.toLocaleString()} FCFA`, sub: `${dateOrders.length} commandes`, icon: ArrowUpRight, color: '#e64980', bg: '#fff0f6' },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" style={{ background: bg }} />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">{label}</p>
                    <h3 className="text-2xl font-black text-[#212529]">{value}</h3>
                    {sub && <p className="text-[9px] font-bold text-[#adb5bd] mt-1 uppercase tracking-widest">{sub}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Graphe horaire */}
          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-[#212529] uppercase tracking-tight">Revenus par heure</h3>
              <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest bg-[#f8f9fa] px-3 py-1 rounded-full border border-[#dee2e6]">
                {format(targetDate, 'dd/MM/yyyy')}
              </span>
            </div>
            {dateOrders.length > 0 ? (
              <HourlyBarChart orders={dateOrders} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-[#adb5bd] gap-4 bg-[#f8f9fa] rounded-[2rem] border border-dashed border-[#dee2e6]">
                <TrendingUp className="w-12 h-12 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Aucune commande ce jour-là</p>
              </div>
            )}
          </div>

          {/* Top produits */}
          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-10">
            <h3 className="text-lg font-black text-[#212529] uppercase tracking-tight mb-6">Top 5 Produits</h3>
            <TopProducts orders={completedOrders} />
          </div>
        </div>
      )}
    </div>
  )
}


