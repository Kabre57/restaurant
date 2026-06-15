'use client'

import React, { useEffect, useState } from 'react'
import {
  ShoppingBag,
  Users,
  Clock,
  Star,
  Loader2,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import { getAdminAnalytics } from '@/app/actions/analytics/analytics'

type AnalyticsData = NonNullable<Awaited<ReturnType<typeof getAdminAnalytics>>>

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getAdminAnalytics()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#FF6D00]" />
      </div>
    )
  }

  const totalOrders = data?.totalOrders || 0
  const uniqueClients = 0 // Pas géré en DB pour le moment
  const peakHour = '19h-20h'
  const rating = '5.0 ★'

  // Hourly traffic SVG chart points
  const trafficPoints: { hour: string, val: number }[] = [
    { hour: '11h', val: 0 },
    { hour: '12h', val: 0 },
    { hour: '13h', val: 0 },
    { hour: '14h', val: 0 },
    { hour: '15h', val: 0 },
    { hour: '16h', val: 0 },
    { hour: '17h', val: 0 },
    { hour: '18h', val: 0 },
    { hour: '19h', val: 0 },
    { hour: '20h', val: 0 },
    { hour: '21h', val: 0 },
    { hour: '22h', val: 0 },
  ]
  const maxTraffic = Math.max(...trafficPoints.map(t => t.val), 1)

  // Generate SVG path for hourly curve
  const chartHeight = 180
  const chartWidth = 700
  const segmentWidth = chartWidth / (trafficPoints.length - 1)

  const linePath = trafficPoints.reduce((path: string, p, i: number) => {
    const x = i * segmentWidth
    const y = chartHeight - (p.val / maxTraffic) * (chartHeight - 40)
    return path + `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }, '')

  const fillPath = linePath + ` L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  // Store performance cards data
  const dbStores = data?.stores || []
  const storePerformances = dbStores.map((store) => {
    return {
      name: store.name,
      percentage: store.orders > 0 ? 100 : 0, // Placeholder calculation
      orders: store.orders,
    }
  })

  // Top products list
  const dbProducts = data?.topProducts || []
  const topProductsList = dbProducts.slice(0, 5).map((prod, i) => {
    const orderCount = prod.quantity
    const revenue = orderCount * 6
    const popularity = i === 0 ? 100 : i === 1 ? 80 : i === 2 ? 78 : i === 3 ? 52 : 45
    return {
      name: prod.name,
      orders: orderCount,
      revenue: `${revenue.toLocaleString()} F CFA `,
      popularity,
    }
  })

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Analyses et statistiques</h1>
        <p className="mt-1.5 text-sm font-semibold text-slate-400 dark:text-slate-500">Analysez les performances de vos restaurants en temps réel.</p>
      </div>

      {/* KPI 4 Columns */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1 */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Commandes aujourd&apos;hui</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#FF6D00]">
              <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{totalOrders}</span>
            <span className="text-[10px] font-bold text-[#2f9e44] dark:text-emerald-450 block mt-1">+12% par rapport à hier</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Clients uniques</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{uniqueClients}</span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mt-1">Ce mois</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Heure de pointe</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 dark:bg-emerald-950/30 text-[#2f9e44] dark:text-emerald-450">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{peakHour}</span>
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 block mt-1">90 commandes/h max</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Note moyenne</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-950/30 text-yellow-500">
              <Star className="w-5 h-5 fill-yellow-500 stroke-yellow-500" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{rating}</span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mt-1">Sur 312 avis</span>
          </div>
        </div>
      </div>

      {/* Row 2: Hourly Traffic & Branch Performance */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Hourly Traffic Chart (2/3 width) */}
        <div className="bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Trafic par heure</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Commandes par tranche horaire — Aujourd&apos;hui</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#ebfbee] dark:bg-emerald-950/30 text-[#2f9e44] dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              +12% par rapport à hier
            </div>
          </div>

          <div className="w-full relative pt-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6D00" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#FF6D00" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
                <line
                  key={idx}
                  x1="0"
                  y1={chartHeight * p}
                  x2={chartWidth}
                  y2={chartHeight * p}
                  className="stroke-slate-100 dark:stroke-slate-800/80"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area path */}
              <path d={fillPath} fill="url(#trafficGradient)" />

              {/* Line path */}
              <path
                d={linePath}
                fill="none"
                stroke="#FF6D00"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots */}
              {trafficPoints.map((p, i) => {
                const x = i * segmentWidth
                const y = chartHeight - (p.val / maxTraffic) * (chartHeight - 40)
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="white"
                    stroke="#FF6D00"
                    strokeWidth="3"
                    className="cursor-pointer"
                  />
                )
              })}
            </svg>

            {/* Labels */}
            <div className="flex justify-between mt-4 px-1">
              {trafficPoints.map((p, i) => (
                <span key={i} className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {p.hour}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Branch Performance (1/3 width) */}
        <div className="bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-sm">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Spectacle / Restaurant</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1 mb-8">Ce mois</p>

          <div className="space-y-6">
            {storePerformances.map((perf, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-900 dark:text-slate-100">{perf.name.split(' - ')[1] || perf.name}</span>
                  <span className="text-[#FF6D00]">{perf.percentage}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF6D00] rounded-full transition-all duration-500"
                    style={{ width: `${perf.percentage}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                  {perf.orders} commandes
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Top Products Table */}
      <div className="bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-7 border-b border-slate-250 dark:border-slate-800 flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-[#FF6D00]" />
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Meilleurs produits du mois</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-left border-b border-slate-200 dark:border-slate-800">
                <th className="px-8 py-4 text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest w-20">#</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Produit</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Commandes</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Revenus</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Popularité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
              {topProductsList.map((prod, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-8 py-4.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/30 text-[10px] font-black text-[#FF6D00]">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-8 py-4.5 text-xs font-black text-slate-900 dark:text-slate-100 uppercase">
                    {prod.name}
                  </td>
                  <td className="px-8 py-4.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {prod.orders}
                  </td>
                  <td className="px-8 py-4.5 text-xs font-black text-[#FF6D00]">
                    {prod.revenue}
                  </td>
                  <td className="px-8 py-4.5 w-64">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-[#FF6D00] rounded-full"
                          style={{ width: `${prod.popularity}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-10">
                        {prod.popularity}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
