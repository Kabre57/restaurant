// src/app/backoffice/consolidated/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import RestaurateurLayout from "@/app/restaurateur/layout"
import {
  TrendingUp,
  Layers,
  Calendar,
  Building,
  DollarSign,
  Download,
  Percent,
  ShoppingCart,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  TrendingDown,
} from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { format, subDays, startOfMonth } from "date-fns"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface KPI {
  totalCA: number
  totalMarge: number
  totalOrders: number
  totalCouverts: number
  averageOrderValue: number
  margePercentage: number
}

interface StoreComparison {
  storeId: string
  storeName: string
  ca: number
  marge: number
  nbOrders: number
  nbCouverts: number
  averageBasket: number
}

interface TimelinePoint {
  date: string
  ca: number
  marge: number
  nbOrders: number
  nbCouverts: number
}

interface DashboardData {
  kpis: KPI
  storeComparison: StoreComparison[]
  timeline: TimelinePoint[]
}

interface StoreSelectOption {
  id: string
  name: string
}

export default function ConsolidatedAnalyticsPage() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const userRole = session?.user?.role
  const isAuthorized = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "RESTAURATEUR" || userRole === "MANAGER"

  // Date Filters
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  )
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [storeId, setStoreId] = useState<string>("all")
  const [storesList, setStoresList] = useState<StoreSelectOption[]>([])
  
  // Dashboard Data
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStoresList = async () => {
    try {
      const res = await fetch("/api/stores")
      if (res.ok) {
        const list = await res.json()
        if (Array.isArray(list)) {
          setStoresList(list)
        }
      }
    } catch (err) {
      console.error("Error fetching stores:", err)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        storeId,
      })
      const res = await fetch(`/api/consolidated/dashboard?${queryParams.toString()}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Impossible de charger les données consolidées")
      }
      const dashboard = await res.json()
      setData(dashboard)
    } catch (err: any) {
      console.error(err)
      toast(err.message || "Erreur de chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && isAuthorized) {
      loadStoresList()
    }
  }, [status, userRole])

  useEffect(() => {
    if (status === "authenticated" && isAuthorized) {
      loadDashboardData()
    }
  }, [status, startDate, endDate, storeId])

  const setPreset = (preset: "today" | "week" | "month" | "year") => {
    const today = new Date()
    if (preset === "today") {
      setStartDate(format(today, "yyyy-MM-dd"))
      setEndDate(format(today, "yyyy-MM-dd"))
    } else if (preset === "week") {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"))
      setEndDate(format(today, "yyyy-MM-dd"))
    } else if (preset === "month") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"))
      setEndDate(format(today, "yyyy-MM-dd"))
    } else if (preset === "year") {
      setStartDate(format(subDays(today, 365), "yyyy-MM-dd"))
      setEndDate(format(today, "yyyy-MM-dd"))
    }
  }

  const exportToCSV = () => {
    if (!data) return

    // 1. Prepare KPIs sheet
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "REPORT CONSOLIDE PARABELLUM POS\n"
    csvContent += `Periode:;${startDate} au ${endDate}\n\n`
    
    csvContent += "INDICATEURS CONSOLIDES\n"
    csvContent += `Chiffre d'Affaires total:;${data.kpis.totalCA} FCFA\n`
    csvContent += `Marge totale:;${data.kpis.totalMarge} FCFA\n`
    csvContent += `Pourcentage de Marge:;${data.kpis.margePercentage.toFixed(2)}%\n`
    csvContent += `Nombre de transactions:;${data.kpis.totalOrders}\n`
    csvContent += `Panier Moyen:;${data.kpis.averageOrderValue.toFixed(2)} FCFA\n\n`

    // 2. Prepare Store Breakdown
    csvContent += "PERFORMANCES PAR ETABLISSEMENT\n"
    csvContent += "Etablissement;Chiffre d'Affaires;Marge;Transactions;Panier Moyen\n"
    data.storeComparison.forEach((store) => {
      csvContent += `${store.storeName};${store.ca};${store.marge};${store.nbOrders};${store.averageBasket.toFixed(2)}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Parabellum_Consolide_${startDate}_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast("Exportation CSV lancée !", "success")
  }

  if (status === "loading") {
    return (
      <RestaurateurLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#FF6D00] animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Chargement du dashboard consolidé...
          </p>
        </div>
      </RestaurateurLayout>
    )
  }

  if (!isAuthorized) {
    return (
      <RestaurateurLayout>
        <div className="max-w-md mx-auto my-20 p-6 bg-white dark:bg-[#181a20] rounded-3xl border border-rose-500/20 text-center space-y-4 shadow-sm">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black uppercase text-[#171717] dark:text-white">
            Accès Refusé
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            Vous ne disposez pas des accès requis pour consulter les rapports consolidés de franchise.
          </p>
        </div>
      </RestaurateurLayout>
    )
  }

  // Formatting chart data labels
  const formattedTimeline = data?.timeline.map((point) => ({
    ...point,
    formattedDate: new Date(point.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    }),
  })) || []

  return (
    <RestaurateurLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">
              Reporting Centralisé
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#171717] dark:text-white mt-1">
              Rapports Consolidés
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Consultez les indicateurs financiers cumulés de l'ensemble de vos restaurants en temps réel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportToCSV}
              disabled={!data || loading}
              className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] dark:border-[#2e3440] bg-white dark:bg-[#181a20] hover:bg-slate-50 dark:hover:bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Exporter Excel
            </button>

            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="p-3 bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-[#868e96] cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${loading && "animate-spin"}`} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(["today", "week", "month", "year"] as const).map((preset) => {
              const labels = {
                today: "Aujourd'hui",
                week: "7 Jours",
                month: "Ce mois",
                year: "Cette année",
              }
              return (
                <button
                  key={preset}
                  onClick={() => setPreset(preset)}
                  className="rounded-xl px-4 py-2 border border-[#E5E7EB] dark:border-[#2e3440] hover:border-[#FF6D00] text-xs font-bold transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  {labels[preset]}
                </button>
              )
            })}
          </div>

          {/* Core Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Store Select */}
            {(userRole === "ADMIN" || userRole === "SUPER_ADMIN" || storesList.length > 1) && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-400" />
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-2xl px-4 py-2 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                >
                  <option value="all">Tous les restaurants</option>
                  {storesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-2xl px-4 py-2 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
              />
              <span className="text-slate-400 text-xs font-black uppercase">à</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-2xl px-4 py-2 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
              />
            </div>
          </div>
        </div>

        {/* KPIs Summary */}
        {loading || !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#181a20] h-32 rounded-3xl animate-pulse border border-[#E5E7EB] dark:border-[#2e3440]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  CA Consolidé
                </span>
                <div className="h-9 w-9 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-[#171717] dark:text-white">
                {new Intl.NumberFormat("fr-FR").format(data.kpis.totalCA)} FCFA
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                Sur la période
              </p>
            </div>

            <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Marge Générée
                </span>
                <div className="h-9 w-9 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-[#171717] dark:text-white">
                {new Intl.NumberFormat("fr-FR").format(data.kpis.totalMarge)} FCFA
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1">
                Taux moyen : {data.kpis.margePercentage.toFixed(2)}%
              </p>
            </div>

            <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Transactions
                </span>
                <div className="h-9 w-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-[#171717] dark:text-white">
                {new Intl.NumberFormat("fr-FR").format(data.kpis.totalOrders)}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                Commandes servies
              </p>
            </div>

            <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Panier Moyen
                </span>
                <div className="h-9 w-9 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-[#171717] dark:text-white">
                {new Intl.NumberFormat("fr-FR").format(Math.round(data.kpis.averageOrderValue))} FCFA
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                Valeur par transaction
              </p>
            </div>
          </div>
        )}

        {/* Charts & Graphs */}
        {data && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Timeline chart */}
            <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] dark:text-[#72788f] mb-4">
                Évolution journalière des ventes & marge
              </h3>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedTimeline}>
                    <defs>
                      <linearGradient id="chartCa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6D00" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#FF6D00" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="chartMarge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="formattedDate" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#94A3B8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#94A3B8" }} tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(24, 26, 32, 0.95)", borderRadius: "16px", borderColor: "#2E3440", fontSize: "11px", color: "#ECEFF4" }} formatter={(value) => [`${Number(value).toLocaleString()} FCFA`]} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                    <Area name="Chiffre d'Affaires" type="monotone" dataKey="ca" stroke="#FF6D00" strokeWidth={3} fill="url(#chartCa)" />
                    <Area name="Marge" type="monotone" dataKey="marge" stroke="#10B981" strokeWidth={3} fill="url(#chartMarge)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Store Comparison chart */}
            <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] dark:text-[#72788f] mb-4">
                Chiffre d'affaires par établissement
              </h3>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.storeComparison}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="storeName" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#94A3B8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#94A3B8" }} tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(24, 26, 32, 0.95)", borderRadius: "16px", borderColor: "#2E3440", fontSize: "11px", color: "#ECEFF4" }} formatter={(value) => [`${Number(value).toLocaleString()} FCFA`]} />
                    <Bar name="Chiffre d'Affaires" dataKey="ca" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Stores Comparison Table */}
        {data && !loading && (
          <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#F0F1F6] dark:border-[#2e3440]">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#171717] dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#FF6D00]" />
                Performances détaillées du réseau
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] dark:bg-[#181a20]/40 text-[#868e96] text-[10px] font-black uppercase tracking-wider border-b border-[#E5E7EB] dark:border-[#2e3440]">
                    <th className="px-6 py-4">Établissement</th>
                    <th className="px-6 py-4 text-right">CA Total</th>
                    <th className="px-6 py-4 text-right">Marge commerciale</th>
                    <th className="px-6 py-4 text-center">Taux Marge (%)</th>
                    <th className="px-6 py-4 text-right">Nombre de Commandes</th>
                    <th className="px-6 py-4 text-right">Panier Moyen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F1F6] dark:divide-[#2e3440] text-xs font-semibold">
                  {data.storeComparison.map((store) => {
                    const marginRate = store.ca > 0 ? (store.marge / store.ca) * 100 : 0
                    return (
                      <tr
                        key={store.storeId}
                        className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center font-black">
                              {store.storeName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[#171717] dark:text-white uppercase tracking-wider text-[11px] font-bold">
                              {store.storeName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-[#171717] dark:text-white">
                          {new Intl.NumberFormat("fr-FR").format(store.ca)} FCFA
                        </td>
                        <td className="px-6 py-5 text-right text-emerald-500 font-extrabold">
                          {new Intl.NumberFormat("fr-FR").format(store.marge)} FCFA
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 px-3 py-1 text-[10px] font-extrabold uppercase">
                            {marginRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right text-[#171717] dark:text-white">
                          {store.nbOrders}
                        </td>
                        <td className="px-6 py-5 text-right text-slate-500 dark:text-slate-400 font-bold">
                          {new Intl.NumberFormat("fr-FR").format(Math.round(store.averageBasket))} FCFA
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RestaurateurLayout>
  )
}
