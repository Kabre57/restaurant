'use client'

import React, { useState, useEffect } from 'react'
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Percent,
  Activity,
  ArrowRight,
  RefreshCw,
  Search,
  PackageCheck
} from 'lucide-react'
import { getGlobalStats, getPendingValidations } from '@/app/actions/analytics/admin'
import { getStores } from '@/app/actions/store/stores'
import { getMultiSiteCriticalStocks, getRecentMultiSiteMovements } from '@/app/actions/superviseur/superviseur'

type GlobalStats = {
  orderCount: number
  storeCount: number
  totalRevenue: number
  totalCommissions: number
  topStores: { id: string; name: string; orderCount: number; revenue: number }[]
}

type StoreItem = {
  id: string
  name: string
  phone?: string | null
  commission?: number | null
  createdAt?: Date | string
}

export default function MultiSiteSupervision() {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [stores, setStores] = useState<StoreItem[]>([])
  const [criticalStocks, setCriticalStocks] = useState<any[]>([])
  const [recentMovements, setRecentMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  async function loadData() {
    try {
      const [stats, storesList, stocks, movements] = await Promise.all([
        getGlobalStats() as unknown as GlobalStats,
        getStores(),
        getMultiSiteCriticalStocks(),
        getRecentMovementsWithFallback()
      ])
      
      setGlobalStats(stats)
      setStores(storesList as StoreItem[])
      setCriticalStocks(stocks || [])
      setRecentMovements(movements || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // StockMovements might be empty, make sure we fallback elegantly
  async function getRecentMovementsWithFallback() {
    try {
      const res = await getRecentMultiSiteMovements()
      return res || []
    } catch (err) {
      return []
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoaderSpinner />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Chargement de la supervision...</span>
        </div>
      </div>
    )
  }

  const totalRevenue = globalStats?.totalRevenue || 0
  const totalCommissions = globalStats?.totalCommissions || 0
  const totalOrdersCount = globalStats?.orderCount || 0
  const activeStoresCount = stores.length

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Map performance of stores from globalStats or mock elegant fallbacks
  const storePerformanceMap = new Map(
    (globalStats?.topStores || []).map(s => [s.id, s])
  )

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">Espace Administrateur</span>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">SUPERVISION MULTI-SITES</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 dark:text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Grid of Global Analytics KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Chiffre d'Affaires Global */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#FF6D00]">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="bg-[#ebfbee] dark:bg-emerald-950/30 text-[#2f9e44] dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              Plateforme
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Chiffre d&apos;Affaires Global</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalRevenue.toLocaleString()} FCFA</span>
          </div>
        </div>

        {/* KPI 2: Commissions Générées */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-emerald-950/30 text-[#2f9e44] dark:text-[#0ca678]">
              <Percent className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="bg-[#e6fcf5] dark:bg-teal-950/30 text-[#0ca678] dark:text-teal-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full font-mono">
              ~10% moy.
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Commissions Totales</span>
            <span className="text-2xl font-black text-[#2f9e44] dark:text-emerald-400">{totalCommissions.toLocaleString()} FCFA</span>
          </div>
        </div>

        {/* KPI 3: Restaurants Enregistrés */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-[#1c7ed6]">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="bg-[#e7f5ff] dark:bg-blue-950/40 text-[#1c7ed6] dark:text-blue-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              Actifs
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Restaurants Partenaires</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{activeStoresCount}</span>
          </div>
        </div>

        {/* KPI 4: Alertes Stock critique */}
        <div className="bg-white dark:bg-[#181a20] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-rose-950/30 text-[#e03131]">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            {criticalStocks.length > 0 ? (
              <span className="bg-[#fff5f5] dark:bg-rose-950/40 text-[#e03131] dark:text-rose-450 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse">
                CRITIQUE
              </span>
            ) : (
              <span className="bg-[#ebfbee] dark:bg-emerald-950/30 text-[#2f9e44] dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Sains
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Alertes de Stocks</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{criticalStocks.length}</span>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Side: Store performance lists */}
        <div className="bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Performances des Restaurants</h2>
            
            {/* Search inputs */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="RECHERCHER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6D00] text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Restaurant</th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Commandes</th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Volume Ventes</th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Commissions</th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStores.map((store) => {
                  const performance = storePerformanceMap.get(store.id)
                  const ordersCount = performance?.orderCount || 0
                  const salesVolume = performance?.revenue || 0
                  const commPercent = store.commission || 10
                  const commissionValue = salesVolume * (commPercent / 100)

                  return (
                    <tr key={store.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#FF6D00] flex items-center justify-center font-black">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-[#FF6D00] transition-colors uppercase">{store.name}</p>
                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{store.phone || 'Non renseigné'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-center text-xs font-black font-mono text-slate-900 dark:text-slate-100">
                        {ordersCount}
                      </td>
                      <td className="py-4 text-right text-xs font-black text-slate-900 dark:text-slate-100">
                        {salesVolume.toLocaleString()} FCFA
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-[#2f9e44] dark:text-emerald-450">{commissionValue.toLocaleString()} FCFA</span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{commPercent}% commission</span>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-[#ebfbee] dark:bg-emerald-950/30 text-[#2f9e44] dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2f9e44] animate-ping" />
                          Live
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {filteredStores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">
                      Aucun restaurant trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Stocks alert & Audit Move */}
        <div className="space-y-8">
          {/* Alerts Card */}
          <div className="bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-[#e03131]">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">Stock Critique Multi-sites</h2>
            </div>

            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
              {criticalStocks.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#e03131] dark:text-rose-400 uppercase truncate">{item.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">{item.store?.name || 'Restaurant'}</p>
                  </div>
                  <span className="shrink-0 bg-white dark:bg-slate-900 border border-[#e03131] text-[#e03131] dark:text-rose-450 text-[9px] font-black uppercase px-2.5 py-1 rounded-md">
                    STOCK: {item.stockQuantity} (MIN {item.minStockLevel})
                  </span>
                </div>
              ))}

              {criticalStocks.length === 0 && (
                <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-450 flex flex-col items-center justify-center gap-2">
                  <PackageCheck className="w-8 h-8 opacity-20 text-[#2f9e44]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2f9e44]">Tous les stocks sont opérationnels</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit trail stock list */}
          <div className="bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-[#FF6D00]">
              <Activity className="w-5 h-5 stroke-[2.5]" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">Audit Mouvements Stock</h2>
            </div>

            <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
              {recentMovements.map((mvt) => {
                const isPositive = mvt.quantity > 0
                return (
                  <div key={mvt.id} className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-b-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase truncate">{mvt.product?.name || 'Produit inconnu'}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{mvt.product?.store?.name || 'Restaurant'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          mvt.reason === 'SALE' ? 'bg-orange-50 dark:bg-orange-950/30 text-[#FF6D00]' :
                          mvt.reason === 'ADJUSTMENT' ? 'bg-blue-50 dark:bg-blue-950/30 text-[#1c7ed6]' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {mvt.reason}
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-black ${isPositive ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
                      {isPositive ? `+${mvt.quantity}` : mvt.quantity}
                    </span>
                  </div>
                )
              })}

              {recentMovements.length === 0 && (
                <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  Aucun mouvement de stock enregistré
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoaderSpinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-[#FF6D00]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
