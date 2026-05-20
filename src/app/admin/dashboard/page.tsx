'use client'

import React, { useState, useEffect } from 'react'
import { 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  MoreVertical,
  DollarSign,
  CheckCircle2,
  ChevronDown
} from 'lucide-react'
import { getSalesReport, getGlobalStats, getPendingValidations } from '@/app/actions/admin'

type GlobalStats = {
  orderCount: number
  storeCount: number
  totalRevenue: number
  totalCommissions: number
  topStores: { id: string, name: string, orderCount: number, revenue: number }[]
}

type PendingStats = {
  pendingRestaurateurs: number
  pendingDelivery: number
  totalPending: number
}

export default function AdminDashboard() {
  const [salesData, setSalesData] = useState<{name: string, value: number}[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [pendingStats, setPendingStats] = useState<PendingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const [sales, stats, pending] = await Promise.all([
        getSalesReport('store_01', 'daily'),
        getGlobalStats() as unknown as GlobalStats,
        getPendingValidations()
      ])
      setSalesData(sales)
      setGlobalStats(stats)
      setPendingStats(pending)
      setLoading(false)
    }
    loadData()
  }, [])

  // Mock some visual ratios if data is small for the beautiful charts
  const totalOrders = globalStats?.orderCount || 142
  const activeStores = globalStats?.storeCount || 3
  const totalRevenue = globalStats?.totalRevenue || 4231.89
  const pendingAlerts = pendingStats?.totalPending || 2

  // For the smooth weekly curve SVG chart
  const points = [
    { day: 'Lun', val: 1200 },
    { day: 'Mar', val: 1500 },
    { day: 'Mer', val: 1100 },
    { day: 'Jeu', val: 2200 },
    { day: 'Ven', val: 1800 },
    { day: 'Sam', val: 3500 },
    { day: 'Dim', val: 2800 },
  ]
  const maxVal = Math.max(...points.map(p => p.val), 1)

  // Generate SVG path for smooth line
  const chartHeight = 220
  const chartWidth = 600
  const segmentWidth = chartWidth / (points.length - 1)
  
  const linePath = points.reduce((path, p, i) => {
    const x = i * segmentWidth
    const y = chartHeight - (p.val / maxVal) * (chartHeight - 40)
    return path + `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }, '')

  const fillPath = linePath + ` L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header title */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#171717]">Administrateur de point de vente</h1>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Commandes en cours */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6D00]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="bg-[#ebfbee] text-[#2f9e44] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              +1 Nouveau
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#868e96] block mb-1">Commandes en cours</span>
            <span className="text-3xl font-black text-[#171717]">{activeStores}</span>
          </div>
          <div className="absolute right-6 bottom-4 opacity-70">
            <svg className="w-20 h-10 text-[#FF6D00]" fill="none" viewBox="0 0 60 20">
              <path d="M0,15 Q15,3 30,12 T60,4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Complété */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-[#2f9e44]">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="bg-[#ebfbee] text-[#2f9e44] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              +12,5%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#868e96] block mb-1">Complété</span>
            <span className="text-3xl font-black text-[#171717]">{totalOrders}</span>
          </div>
        </div>

        {/* Card 3: Alertes */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#e03131]">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="bg-[#fff5f5] text-[#e03131] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              Nécessite une action
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#868e96] block mb-1">Alertes</span>
            <span className="text-3xl font-black text-[#171717]">{pendingAlerts}</span>
          </div>
        </div>

        {/* Card 4: Revenu total */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6D00]">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="bg-[#ebfbee] text-[#2f9e44] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              +20,1%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#868e96] block mb-1">Revenu total</span>
            <span className="text-3xl font-black text-[#171717]">{totalRevenue.toLocaleString()} $</span>
          </div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Area Chart */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-7 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black text-[#171717]">Aperçu des revenus</h3>
            </div>
            <button className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-xs font-bold text-[#495057] hover:bg-[#F8F9FA] transition-colors">
              Cette semaine <ChevronDown className="w-4 h-4 text-[#868e96]" />
            </button>
          </div>

          <div className="w-full relative pt-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6D00" stopOpacity="0.25" />
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
                  stroke="#F1F3F5"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area path */}
              <path d={fillPath} fill="url(#chartGradient)" />

              {/* Line path */}
              <path
                d={linePath}
                fill="none"
                stroke="#FF6D00"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots on points */}
              {points.map((p, i) => {
                const x = i * segmentWidth
                const y = chartHeight - (p.val / maxVal) * (chartHeight - 40)
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="white"
                    stroke="#FF6D00"
                    strokeWidth="3"
                    className="cursor-pointer hover:r-7 transition-all"
                  />
                )
              })}
            </svg>

            {/* Labels below chart */}
            <div className="flex justify-between mt-4 px-2">
              {points.map((p, i) => (
                <span key={i} className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                  {p.day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Donut Chart */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-7 shadow-sm">
          <h3 className="text-base font-black text-[#171717] mb-8">Sources de commande</h3>

          <div className="flex flex-col items-center justify-center relative">
            <svg width="200" height="200" className="-rotate-90">
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="transparent"
                stroke="#E5E7EB"
                strokeWidth="24"
              />
              {/* Repas sur place: 55% -> length = 2 * PI * r = 439.8. 55% = 241.9 */}
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="transparent"
                stroke="#FF6D00"
                strokeWidth="24"
                strokeDasharray="439.8"
                strokeDashoffset="197.9" /* 439.8 * 0.45 */
              />
              {/* À emporter: 30% -> offset = 439.8 * 0.15 */}
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="transparent"
                stroke="#171717"
                strokeWidth="24"
                strokeDasharray="131.9 439.8" /* 439.8 * 0.3 */
                strokeDashoffset="439.8" /* 439.8 - 439.8 * 0.55 = 197.9 */
                className="origin-center"
                style={{ transform: 'rotate(198deg)' }}
              />
              {/* Livraison: 15% */}
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="transparent"
                stroke="#868e96"
                strokeWidth="24"
                strokeDasharray="66 439.8" /* 439.8 * 0.15 */
                strokeDashoffset="439.8"
                className="origin-center"
                style={{ transform: 'rotate(306deg)' }}
              />
            </svg>

            {/* Total Indicator in Center */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#868e96]">Total</span>
              <span className="text-2xl font-black text-[#171717]">2 350</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF6D00]" />
                <span className="text-[#868e96]">Repas sur place</span>
              </div>
              <span className="font-black text-[#171717]">55%</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#171717]" />
                <span className="text-[#868e96]">À emporter</span>
              </div>
              <span className="font-black text-[#171717]">30%</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#868e96]" />
                <span className="text-[#868e96]">Livraison</span>
              </div>
              <span className="font-black text-[#171717]">15%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
