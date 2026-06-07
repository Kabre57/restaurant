'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getStoreOrders } from '@/app/actions/orders'
import { useSession } from 'next-auth/react'
import {
  Loader2,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Calendar,
  ArrowUpRight,
  Download,
  Search,
  Filter,
  BarChart2,
  Grid,
  Percent,
  ChevronDown,
  ChevronUp,
  Gift
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns'

type StatsOrder = {
  id: string
  status: string
  total: number
  discount: number
  customerId?: string | null
  loyaltyPointsEarned: number
  loyaltyPointsRedeemed: number
  createdAt: Date | string
  items?: {
    quantity: number
    price: number
    product: {
      name: string
      category?: {
        name: string
      }
    }
  }[]
  payments?: {
    amount: number
    paymentMethod: {
      name: string
    }
  }[]
  table?: {
    name: string
  } | null
}

// ─── SVG HORARY GRAPH ────────────────────────────────────────────────────────

function HourlyBarChart({ orders }: { orders: StatsOrder[] }) {
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
            <g key={h} className="group cursor-pointer">
              <title>{`${h}h : ${val.toLocaleString()} FCFA`}</title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                className={`transition-all duration-300 hover:fill-orange-600 ${
                  isActive ? 'fill-[#FF6D00]' : 'fill-[#E5E7EB] dark:fill-slate-800'
                }`}
              />
              {h % labelEvery === 0 && (
                <text x={x + barW / 2} y={H + 18} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400 font-bold">
                  {String(h).padStart(2, '0')}h
                </text>
              )}
              {val > 0 && barH > 20 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="#FF6D00" fontWeight="900" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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

// ─── ACTIVITY HEATMAP ────────────────────────────────────────────────────────

const WEEKDAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function ActivityHeatmap({ orders }: { orders: StatsOrder[] }) {
  const { grid, max } = useMemo(() => {
    const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0))
    orders.forEach((o) => {
      const date = new Date(o.createdAt)
      let dayIndex = date.getDay() - 1 // 0 is Sunday, 1 is Monday, etc.
      if (dayIndex === -1) dayIndex = 6 // Move Sunday to index 6
      const hour = date.getHours()
      matrix[dayIndex][hour] += o.total
    })
    
    let maxVal = 0
    matrix.forEach(row => {
      row.forEach(val => {
        if (val > maxVal) maxVal = val
      })
    })
    return { grid: matrix, max: maxVal || 1 }
  }, [orders])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Répartition horaire par jour</h4>
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Couleur plus sombre = Chiffre d&apos;affaires plus élevé</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="min-w-[760px] space-y-1">
          {/* Header hours */}
          <div className="flex text-center mb-1">
            <div className="w-24 shrink-0" />
            <div className="flex-1 grid grid-cols-24 gap-1">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {h}h
                </div>
              ))}
            </div>
          </div>

          {/* Grid rows */}
          {grid.map((row, dIdx) => (
            <div key={dIdx} className="flex items-center">
              <div className="w-24 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase shrink-0">
                {WEEKDAYS_FR[dIdx]}
              </div>
              <div className="flex-1 grid grid-cols-24 gap-1">
                {row.map((val, hIdx) => {
                  const pct = val > 0 ? val / max : 0
                  const color = val > 0 
                    ? `rgba(255, 109, 0, ${Math.max(0.15, pct)})` 
                    : undefined
                  
                  return (
                    <div
                      key={hIdx}
                      className="aspect-square rounded-md border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 transition-all hover:scale-105 hover:shadow-md cursor-pointer relative group flex items-center justify-center"
                      style={val > 0 ? { background: color } : undefined}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[9px] px-2 py-1 rounded shadow-lg z-30 whitespace-nowrap">
                        <span className="font-black uppercase">{WEEKDAYS_FR[dIdx]} à {hIdx}h</span>
                        <span className="font-bold text-[#FF6D00]">{val.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function RestaurateurStats() {
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState<StatsOrder[]>([])
  const [loading, setLoading] = useState(true)
  
  // Date selection states
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('today')
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // Tabs states
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'heatmap'>('overview')

  // Product Table states
  const [productSearch, setProductSearch] = useState('')
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'name'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (status === 'loading') return

    const storeId = session?.user?.storeId
    if (!storeId) {
      setLoading(false)
      return
    }
    
    const activeStoreId = storeId as string
    let isCancelled = false

    async function fetchStats() {
      try {
        setLoading(true)
        const data = await getStoreOrders(activeStoreId)
        if (isCancelled) return
        setOrders(data as StatsOrder[])
      } catch (err) {
        console.error("Failed to load store statistics:", err)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void fetchStats()
    return () => { isCancelled = true }
  }, [session?.user?.storeId, status])

  // Compute intervals
  const computedRange = useMemo(() => {
    let start = startOfDay(new Date())
    let end = endOfDay(new Date())
    const now = new Date()

    if (datePreset === 'today') {
      start = startOfDay(now)
      end = endOfDay(now)
    } else if (datePreset === 'yesterday') {
      const yesterday = subDays(now, 1)
      start = startOfDay(yesterday)
      end = endOfDay(yesterday)
    } else if (datePreset === '7days') {
      start = startOfDay(subDays(now, 7))
      end = endOfDay(now)
    } else if (datePreset === '30days') {
      start = startOfDay(subDays(now, 30))
      end = endOfDay(now)
    } else {
      start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date(0))
      end = endDate ? endOfDay(new Date(endDate)) : endOfDay(now)
    }

    return { start, end }
  }, [datePreset, startDate, endDate])

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const date = new Date(o.createdAt)
      return isWithinInterval(date, { start: computedRange.start, end: computedRange.end }) && o.status !== 'CANCELLED'
    })
  }, [orders, computedRange])

  // Compute KPIs
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.total, 0)
  }, [filteredOrders])

  const totalDiscount = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.discount || 0), 0)
  }, [filteredOrders])

  const loyaltyPointsRedeemed = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.loyaltyPointsRedeemed || 0), 0)
  }, [filteredOrders])

  const averagePointsPerClient = useMemo(() => {
    const uniqueClients = new Set(filteredOrders.map(o => o.customerId).filter(Boolean))
    return uniqueClients.size > 0 ? Math.round(loyaltyPointsRedeemed / uniqueClients.size) : 0
  }, [filteredOrders, loyaltyPointsRedeemed])

  const averageOrderValue = useMemo(() => {
    return filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0
  }, [filteredOrders, totalRevenue])

  // Compute products table data
  const productsData = useMemo(() => {
    const counts: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {}
    filteredOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const pName = item.product.name
        const catName = item.product.category?.name || 'Sans catégorie'
        if (!counts[pName]) {
          counts[pName] = { name: pName, category: catName, quantity: 0, revenue: 0 }
        }
        counts[pName].quantity += item.quantity
        counts[pName].revenue += item.quantity * item.price
      })
    })
    
    let list = Object.values(counts)
    
    if (productSearch) {
      const q = productSearch.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    }
    
    return list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'quantity') cmp = a.quantity - b.quantity
      else if (sortBy === 'revenue') cmp = a.revenue - b.revenue
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [filteredOrders, productSearch, sortBy, sortOrder])

  // Export Orders CSV
  const exportOrdersCSV = () => {
    const data = filteredOrders.map((o) => {
      const dateStr = format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm')
      const paymentMethods = o.payments && o.payments.length > 0
        ? o.payments.map((p) => `${p.paymentMethod?.name || 'Inconnu'} (${p.amount} FCFA)`).join(' + ')
        : 'Inconnu'
      return {
        'ID Commande': o.id,
        'Date': dateStr,
        'Table': o.table?.name || 'Emporter/Livraison',
        'Statut': o.status,
        'Total (FCFA)': o.total,
        'Remise (FCFA)': o.discount || 0,
        'Points Gagnes': o.loyaltyPointsEarned || 0,
        'Points Echanges': o.loyaltyPointsRedeemed || 0,
        'Modes de Paiement': paymentMethods,
      }
    })

    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(';'),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const val = row[fieldName as keyof typeof row]
            const escaped = ('' + val).replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(';')
      ),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `commandes_${format(computedRange.start, 'yyyy-MM-dd')}_au_${format(computedRange.end, 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Products CSV
  const exportProductsCSV = () => {
    const data = productsData.map((p) => ({
      'Produit': p.name,
      'Categorie': p.category,
      'Quantite Vendue': p.quantity,
      'Chiffre d\'affaires (FCFA)': p.revenue,
    }))

    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(';'),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const val = row[fieldName as keyof typeof row]
            const escaped = ('' + val).replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(';')
      ),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `ventes_produits_${format(computedRange.start, 'yyyy-MM-dd')}_au_${format(computedRange.end, 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSort = (field: 'quantity' | 'revenue' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase sm:text-3xl">Performance & Rapports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Analyse détaillée des ventes, fidélité et produits</p>
        </div>

        {/* Date presets & Custom inputs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm shrink-0">
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 sm:border-b-0 sm:pb-0 sm:pr-3 sm:border-r">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: '7days', label: '7 jours' },
              { id: '30days', label: '30 jours' },
              { id: 'custom', label: 'Perso' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id as any)}
                className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
                  datePreset === p.id 
                    ? 'bg-[#FF6D00] text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none"
              />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">AU</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {format(computedRange.start, 'dd/MM/yyyy')} - {format(computedRange.end, 'dd/MM/yyyy')}
              </span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-slate-500 dark:text-slate-400" /></div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Chiffre d'affaires", value: `${totalRevenue.toLocaleString()} FCFA`, icon: DollarSign, color: '#2f9e44', bg: '#ebfbee', sub: `${filteredOrders.length} commandes` },
              { label: 'Panier Moyen', value: `${Math.round(averageOrderValue).toLocaleString()} FCFA`, icon: TrendingUp, color: '#845ef7', bg: '#f3f0ff', sub: 'Par commande réglée' },
              { label: 'Remises Accordées', value: `${totalDiscount.toLocaleString()} FCFA`, icon: Percent, color: '#e64980', bg: '#fff0f6', sub: 'Campagnes & Promos' },
              { 
                label: 'Points Utilisés', 
                value: `${loyaltyPointsRedeemed.toLocaleString()} Pts`, 
                icon: Gift, 
                color: '#f59f00', 
                bg: '#fff9db', 
                sub: [
                  `Valeur des points échangés : -${(loyaltyPointsRedeemed * 10).toLocaleString()} FCFA`,
                  `Points moyens par client : ${averagePointsPerClient} Pts`,
                  `Points convertis : ${loyaltyPointsRedeemed.toLocaleString()} Pts`
                ] 
              },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white dark:bg-[#181a20] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 dark:opacity-20" style={{ background: bg }} />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{value}</h3>
                    {Array.isArray(sub) ? (
                      <div className="mt-1 space-y-0.5">
                        {sub.map((s, idx) => (
                          <p key={idx} className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{s}</p>
                        ))}
                      </div>
                    ) : (
                      sub && <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">{sub}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Tabs & CSV Exports */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
            <div className="flex items-center gap-2">
              {[
                { id: 'overview', label: "Vue d'ensemble", icon: BarChart2 },
                { id: 'products', label: 'Ventes par produit', icon: ShoppingBag },
                { id: 'heatmap', label: 'Heatmap horaire', icon: Grid }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all -mb-[2px] ${
                    activeTab === t.id 
                      ? 'border-[#FF6D00] text-[#FF6D00]' 
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportOrdersCSV}
                disabled={filteredOrders.length === 0}
                className="flex items-center gap-2 bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 disabled:opacity-50 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Commandes (CSV)
              </button>
              <button
                onClick={exportProductsCSV}
                disabled={productsData.length === 0}
                className="flex items-center gap-2 bg-[#FF6D00] hover:bg-orange-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Ventes Produits (CSV)
              </button>
            </div>
          </div>

          {/* TAB CONTENTS */}

          {activeTab === 'overview' && (
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a20] p-6 shadow-sm sm:rounded-[2.5rem] sm:p-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Revenus par heure</h3>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                  {format(computedRange.start, 'dd/MM/yyyy')} - {format(computedRange.end, 'dd/MM/yyyy')}
                </span>
              </div>
              {filteredOrders.length > 0 ? (
                <HourlyBarChart orders={filteredOrders} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-550 dark:text-slate-400 gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-3xl">📊</span>
                  <p className="text-xs font-black uppercase tracking-widest">Aucune donnée sur la période sélectionnée</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a20] p-6 shadow-sm sm:rounded-[2.5rem] sm:p-10 space-y-6">
              {/* Product controls */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="RECHERCHER UN PRODUIT OU UNE CATÉGORIE..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase focus:outline-none focus:ring-1 focus:ring-[#FF6D00] transition-all text-slate-900 dark:text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Produit</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Catégorie</th>
                      <th 
                        onClick={() => handleSort('quantity')}
                        className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Quantité Vendue
                          {sortBy === 'quantity' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#FF6D00]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#FF6D00]" />)}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('revenue')}
                        className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Revenu Total
                          {sortBy === 'revenue' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#FF6D00]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#FF6D00]" />)}
                        </div>
                      </th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Part du CA (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsData.length > 0 ? (
                      productsData.map((p) => {
                         const pct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0
                        return (
                          <tr key={p.name} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all last:border-0">
                            <td className="p-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{p.name}</td>
                            <td className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{p.category}</td>
                            <td className="p-4 text-xs font-black text-slate-800 dark:text-slate-200">{p.quantity}</td>
                            <td className="p-4 text-xs font-black text-[#FF6D00]">{p.revenue.toLocaleString()} FCFA</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-[#2f9e44]" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400">{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest">
                          Aucun produit trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'heatmap' && (
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181a20] p-6 shadow-sm sm:rounded-[2.5rem] sm:p-10">
              {filteredOrders.length > 0 ? (
                <ActivityHeatmap orders={filteredOrders} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-550 dark:text-slate-400 gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-3xl">📊</span>
                  <p className="text-xs font-black uppercase tracking-widest">Aucune donnée sur la période sélectionnée</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
