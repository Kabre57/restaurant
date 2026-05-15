'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, ArrowDownRight, DollarSign, Download, Filter, Loader2 } from 'lucide-react'
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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:space-y-10 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Finances & Commissions</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Suivi des flux monétaires et revenus de la plateforme</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#dee2e6] bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#495057] transition-all hover:bg-[#f8f9fa] sm:w-auto sm:px-6">
            <Download className="w-4 h-4" /> Exporter PDF
          </button>
          <button className="w-full rounded-2xl bg-[#212529] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black sm:w-auto sm:px-8">
            Nouveau Versement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        {metrics.map((m) => (
          <div key={m.name} className="group rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm transition-all hover:shadow-xl sm:rounded-[2.5rem] sm:p-8">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${m.color} text-white shadow-lg`}>
                {React.cloneElement(m.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
              </div>
              <span className="text-[10px] font-black text-[#51cf66] bg-[#ebfbee] px-2 py-1 rounded-lg">{m.trend}</span>
            </div>
            <h3 className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest mb-2">{m.name}</h3>
            <p className="text-2xl font-black tracking-tight text-[#212529] sm:text-3xl">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        {/* Transactions Table */}
        <div className="overflow-hidden rounded-[2rem] border border-[#dee2e6] bg-white shadow-sm sm:rounded-[2.5rem] lg:col-span-2">
          <div className="flex flex-col gap-4 border-b border-[#f1f3f5] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <h3 className="text-sm font-black text-[#212529] uppercase tracking-widest">Transactions Récentes</h3>
            <Filter className="w-4 h-4 text-[#adb5bd] cursor-pointer" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
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
        <div className="rounded-[2rem] bg-[#212529] p-6 text-white shadow-xl sm:rounded-[2.5rem] sm:p-8">
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
            <div className="rounded-[1.75rem] bg-white/5 p-5 sm:p-6">
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
