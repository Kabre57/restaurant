'use client'

import React from 'react'
import { 
  ShoppingBag, 
  Store, 
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
    { name: 'Commandes totales', value: globalStats?.orderCount?.toString() || '0', icon: <ShoppingBag />, color: 'text-[var(--parabellum-primary)]', bg: 'bg-[#eef1ff]' },
    { name: 'Restaurants actifs', value: globalStats?.storeCount?.toString() || '0', icon: <Store />, color: 'text-[var(--parabellum-success)]', bg: 'bg-[#e8f9ee]' },
    { name: 'Revenu total', value: `${(globalStats?.totalRevenue || 0).toLocaleString()} F`, icon: <TrendingUp />, color: 'text-[var(--parabellum-warning)]', bg: 'bg-[#fff7df]' },
    { name: 'Commissions', value: `${(globalStats?.totalCommissions || 0).toLocaleString()} F`, icon: <DollarSign />, color: 'text-[var(--parabellum-primary)]', bg: 'bg-[#eef1ff]' },
  ]

  return (
    <div className="mx-auto max-w-[96rem] space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--parabellum-primary)] sm:text-4xl">ParabellumPOS</h1>
          <p className="mt-2 text-base font-medium text-[#6b7280]">Bienvenue sur l’espace Franchiseur</p>
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          <div className="flex w-full items-center gap-3 rounded-xl border border-[var(--parabellum-primary)]/15 bg-[#eef1ff] px-5 py-3 text-[var(--parabellum-primary)] md:w-auto">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {pendingStats?.totalPending || 0} validations en attente
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="group rounded-xl bg-white p-6 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_1rem_2.5rem_rgba(47,76,221,0.14)]">
            <div className="flex items-center gap-5">
              <div className={`flex h-[5.3rem] w-[5.3rem] shrink-0 items-center justify-center rounded-full ${stat.bg} ${stat.color}`}>
                {React.cloneElement(stat.icon as React.ReactElement<{ className?: string }>, { className: 'h-10 w-10 stroke-[1.7]' })}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[2.35rem] font-black leading-none tracking-tight text-black">{stat.value}</p>
                <h3 className="mt-3 text-sm font-bold uppercase text-[#72788f]">{stat.name}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="relative overflow-hidden rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-black">Résumé des commandes</h3>
                <p className="mt-2 text-sm font-medium text-[#72788f]">Volume de commandes sur 24h</p>
              </div>
              <button className="rounded-lg p-2 text-[var(--parabellum-muted)] transition-all hover:bg-[#eef1ff] hover:text-[var(--parabellum-primary)]"><MoreVertical className="w-4 h-4" /></button>
            </div>
            <div className="min-h-[16rem] w-full">
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--parabellum-primary)] border-t-transparent" />
                </div>
              ) : (
                <SalesChart data={salesData} title="Évolution des Ventes" />
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
            <div className="mb-8 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-black text-black">Top Restaurants</h3>
              <button className="text-sm font-black text-[var(--parabellum-primary)] hover:underline">Voir tout</button>
            </div>
            <div className="space-y-4">
              {globalStats?.topStores?.map((store, idx) => (
                <div key={store.id || idx} className="group flex flex-col gap-4 rounded-xl border border-[#e8eaf4] bg-[#f8f9ff] p-4 transition-all hover:bg-white hover:shadow-lg sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef1ff] text-[var(--parabellum-primary)]">
                      <Store className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-black">{store.name}</h4>
                      <p className="mt-1 text-xs font-semibold text-[#72788f]">{store.orderCount} commandes</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-black text-black">{store.revenue.toLocaleString()} FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="parabellum-gradient relative overflow-hidden rounded-xl p-7 text-white shadow-xl">
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
              <button className="mt-6 w-full rounded-xl bg-white py-3 text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-primary)] transition-all hover:bg-[#f8f9ff]">
                Traiter maintenant
              </button>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
            <h3 className="mb-6 text-2xl font-black text-black">Activité restaurants</h3>
            <div className="space-y-6">
              {globalStats?.topStores?.length ? (
                globalStats.topStores.slice(0, 4).map((store) => (
                  <div key={store.id} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--parabellum-primary)]/10">
                      <Clock className="w-4 h-4 text-[var(--parabellum-primary)]" />
                    </div>
                    <div>
                      <p className="text-[10px] leading-tight text-[var(--parabellum-muted)]">
                        <span className="font-black text-[var(--parabellum-text)]">{store.name}</span> a enregistré <span className="font-black text-[var(--parabellum-text)]">{store.orderCount}</span> commandes.
                      </p>
                      <span className="mt-1 block text-[9px] font-bold uppercase text-[var(--parabellum-muted)]">{store.revenue.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--parabellum-border)] bg-[#f8f9ff] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--parabellum-muted)]">Aucune activité restaurant disponible.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
