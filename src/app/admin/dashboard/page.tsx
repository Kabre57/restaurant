'use client'

import React from 'react'
import { 
  ShoppingBag, 
  Store, 
  Truck, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  MoreVertical,
  Calendar
} from 'lucide-react'
import { getSalesReport } from '@/app/actions/admin'
import SalesChart from '@/components/admin/SalesChart'

export default function AdminDashboard() {
  const [salesData, setSalesData] = React.useState<{name: string, value: number}[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    // Mocking storeId for now, ideally get from session/params
    getSalesReport('store_1', 'daily').then(data => {
      setSalesData(data)
      setLoading(false)
    })
  }, [])

  const stats = [
    { name: 'Commandes du jour', value: salesData.length.toString(), icon: <ShoppingBag />, color: 'bg-[#339af0]', trend: '+12%' },
    { name: 'Restaurants Actifs', value: '24', icon: <Store />, color: 'bg-[#51cf66]', trend: '+2' },
    { name: 'Livreurs Actifs', value: '18', icon: <Truck />, color: 'bg-[#fcc419]', trend: '+3' },
    { name: 'Chiffre d\'affaires', value: `${salesData.reduce((acc, d) => acc + d.value, 0).toLocaleString()} F`, icon: <TrendingUp />, color: 'bg-[#ae3ec9]', trend: '+8%' },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight">Tableau de bord</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Supervision de la plateforme en temps réel</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-[#e03131]/10 text-[#e03131] px-4 py-2 rounded-xl border border-[#e03131]/20">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">3 Alertes Critiques</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-3xl shadow-sm border border-[#dee2e6] hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-lg`}>
                {React.cloneElement(stat.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
              </div>
              <span className="text-[10px] font-black text-[#51cf66] bg-[#ebfbee] px-2 py-1 rounded-lg">{stat.trend}</span>
            </div>
            <h3 className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mb-1">{stat.name}</h3>
            <p className="text-3xl font-black text-[#212529] tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity Chart Area (Placeholder) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-[#dee2e6] shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
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

          <div className="bg-white p-8 rounded-[2rem] border border-[#dee2e6] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest">Top Restaurants</h3>
              <button className="text-[10px] font-black text-[#339af0] hover:underline uppercase tracking-widest">Voir tout</button>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#f8f9fa] border border-[#dee2e6] hover:bg-white hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#dee2e6] flex items-center justify-center text-xl">🏪</div>
                    <div>
                      <h4 className="text-xs font-black text-[#212529] uppercase tracking-tight">Le Gourmet Abidjan</h4>
                      <p className="text-[9px] font-bold text-[#adb5bd] uppercase mt-0.5">342 Commandes • Score 4.8</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#212529]">1.2M FCFA</p>
                    <p className="text-[9px] font-bold text-[#51cf66] uppercase mt-0.5">+15%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Space in Dashboard */}
        <div className="space-y-8">
          <div className="bg-[#212529] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-sm font-black uppercase tracking-widest mb-2">Validations en attente</h3>
              <p className="text-3xl font-black mb-6">08</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                  <span className="text-[10px] font-bold uppercase">Restaurateurs</span>
                  <span className="text-xs font-black">05</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                  <span className="text-[10px] font-bold uppercase">Livreurs</span>
                  <span className="text-xs font-black">03</span>
                </div>
              </div>
              <button className="w-full mt-6 bg-white text-[#212529] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#f1f3f5] transition-all">
                Traiter maintenant
              </button>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-[#dee2e6] shadow-sm">
            <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest mb-6">Logs d'activité</h3>
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
