'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, DollarSign, Download, Filter, Loader2, Store } from 'lucide-react'
import { getFinancialSummary } from '@/app/actions/finances'

export default function FinancesAdminPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFinancialSummary().then(res => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>

  const metrics = [
    { name: 'Volume Total', value: `${data?.totalVolume?.toLocaleString()} F`, icon: <Wallet />, color: 'bg-[#339af0]', trend: '+15.4%' },
    { name: 'Commissions (10%)', value: `${data?.totalCommission?.toLocaleString()} F`, icon: <DollarSign />, color: 'bg-[#51cf66]', trend: '+8.2%' },
    { name: 'Versements Restants', value: '1.2M F', icon: <ArrowDownRight />, color: 'bg-[#fcc419]', trend: '4 stores' },
  ]

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Finances & Commissions</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Suivi des flux monétaires et revenus de la plateforme</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-white border border-[#dee2e6] text-[#495057] px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-[#f8f9fa] transition-all">
            <Download className="w-4 h-4" /> Exporter PDF
          </button>
          <button className="bg-[#212529] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl">
            Nouveau Versement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {metrics.map((m) => (
          <div key={m.name} className="bg-white p-8 rounded-[2.5rem] border border-[#dee2e6] shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${m.color} text-white shadow-lg`}>
                {React.cloneElement(m.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
              </div>
              <span className="text-[10px] font-black text-[#51cf66] bg-[#ebfbee] px-2 py-1 rounded-lg">{m.trend}</span>
            </div>
            <h3 className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mb-2">{m.name}</h3>
            <p className="text-3xl font-black text-[#212529] tracking-tight">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-[#dee2e6] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-[#f1f3f5] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest">Transactions Récentes</h3>
            <Filter className="w-4 h-4 text-[#adb5bd] cursor-pointer" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] text-left">
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Store</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Montant</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Méthode</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {data?.transactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-[#f8f9fa] transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#f1f3f5] flex items-center justify-center text-sm">🏪</div>
                        <span className="text-xs font-black text-[#212529]">{t.order?.store?.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-[#212529]">{t.amount.toLocaleString()} F</td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">{t.method}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-[#ebfbee] text-[#2f9e44] text-[9px] font-black rounded-full uppercase tracking-widest">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Store Performance */}
        <div className="bg-[#212529] rounded-[2.5rem] p-8 text-white shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8">Revenue par Store</h3>
          <div className="space-y-6">
            {data?.stores.map((s: any) => (
              <div key={s.id} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span>{s.name}</span>
                  <span>{s.orderCount} commandes</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#339af0]" style={{ width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="bg-white/5 p-6 rounded-3xl">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Prochain Versement</h4>
              <p className="text-2xl font-black mb-4">450.000 F</p>
              <button className="w-full bg-[#51cf66] text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#40c057] transition-all">
                Démarrer le virement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
