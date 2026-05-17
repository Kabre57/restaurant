'use client'

import React from 'react'
import { 
  ShoppingBag, 
  Store, 
  Truck, 
  TrendingUp, 
  AlertCircle, 
  Clock,
  MoreVertical,
  DollarSign
} from 'lucide-react'
import { getSalesReport, getGlobalStats, getPendingValidations } from '@/app/actions/admin'
import SalesChart from '@/components/admin/SalesChart'

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
  const [salesData, setSalesData] = React.useState<{name: string, value: number}[]>([])
  const [globalStats, setGlobalStats] = React.useState<GlobalStats | null>(null)
  const [pendingStats, setPendingStats] = React.useState<PendingStats | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
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

  const stats = [
    { name: 'Commandes globales', value: globalStats?.orderCount?.toString() || '0', icon: <ShoppingBag />, color: 'bg-[#339af0]', trend: '+12%' },
    { name: 'Restaurants Actifs', value: globalStats?.storeCount?.toString() || '0', icon: <Store />, color: 'bg-[#51cf66]', trend: '+2' },
    { name: 'Chiffre d\'affaires total', value: `${(globalStats?.totalRevenue || 0).toLocaleString()} F`, icon: <TrendingUp />, color: 'bg-[#fcc419]', trend: '+8%' },
    { name: 'Commissions (15%)', value: `${(globalStats?.totalCommissions || 0).toLocaleString()} F`, icon: <DollarSign />, color: 'bg-[#ae3ec9]', trend: '+8%' },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Message */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] sm:text-3xl">Tableau de bord</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#adb5bd] sm:text-sm">Supervision de la plateforme en temps réel</p>
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          <div className="flex w-full items-center gap-2 rounded-xl border border-[#e03131]/20 bg-[#e03131]/10 px-4 py-2 text-[#e03131] md:w-auto">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">3 Alertes Critiques</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="group rounded-3xl border border-[#dee2e6] bg-white p-5 shadow-sm transition-all hover:shadow-xl sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-lg`}>
                {React.cloneElement(stat.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
              </div>
              <span className="text-[10px] font-black text-[#51cf66] bg-[#ebfbee] px-2 py-1 rounded-lg">{stat.trend}</span>
            </div>
            <h3 className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mb-1">{stat.name}</h3>
            <p className="text-2xl font-black tracking-tight text-[#212529] sm:text-3xl">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity Chart Area (Placeholder) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#dee2e6] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest">Activité Horaire</h3>
                <p className="text-[10px] font-bold text-[#adb5bd] uppercase mt-1">Volume de commandes sur 24h</p>
              </div>
              <button className="p-2 hover:bg-[#f1f3f5] rounded-lg transition-all text-[#adb5bd]"><MoreVertical className="w-4 h-4" /></button>
            </div>
            <div className="min-h-[16rem] w-full">
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#339af0] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <SalesChart data={salesData} title="Évolution des Ventes" />
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest">Top Restaurants</h3>
              <button className="text-[10px] font-black text-[#339af0] hover:underline uppercase tracking-widest">Voir tout</button>
            </div>
            <div className="space-y-4">
              {globalStats?.topStores?.map((store, idx) => (
                <div key={store.id || idx} className="group flex flex-col gap-4 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-lg sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#dee2e6] flex items-center justify-center text-xl">🏪</div>
                    <div>
                      <h4 className="text-xs font-black text-[#212529] uppercase tracking-tight">{store.name}</h4>
                      <p className="text-[9px] font-bold text-[#adb5bd] uppercase mt-0.5">{store.orderCount} Commandes</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-black text-[#212529]">{store.revenue.toLocaleString()} FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Space in Dashboard */}
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#212529] p-5 text-white shadow-xl sm:p-8">
            <div className="relative z-10">
              <h3 className="text-sm font-black uppercase tracking-widest mb-2">Validations en attente</h3>
              <p className="mb-6 text-2xl font-black sm:text-3xl">{pendingStats?.totalPending.toString().padStart(2, '0')}</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                  <span className="text-[10px] font-bold uppercase">Restaurateurs</span>
                  <span className="text-xs font-black">{pendingStats?.pendingRestaurateurs.toString().padStart(2, '0')}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                  <span className="text-[10px] font-bold uppercase">Livreurs</span>
                  <span className="text-xs font-black">{pendingStats?.pendingDelivery.toString().padStart(2, '0')}</span>
                </div>
              </div>
              <button className="w-full mt-6 bg-white text-[#212529] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#f1f3f5] transition-all">
                Traiter maintenant
              </button>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-5 shadow-sm sm:p-8">
            <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest mb-6">Logs d&apos;activité</h3>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#f1f3f5] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#adb5bd]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#495057] leading-tight">
                      <span className="font-black text-[#212529]">Admin</span> a validé le compte du livreur <span className="font-black text-[#212529]">Moussa Traoré</span>
                    </p>
                    <span className="text-[9px] font-bold text-[#adb5bd] uppercase mt-1 block">Il y a 2h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
