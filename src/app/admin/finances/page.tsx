'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, ArrowDownRight, DollarSign, Download, Filter, Loader2 } from 'lucide-react'
import { getFinancialSummary } from '@/app/actions/finances'

type FinancialSummary = NonNullable<Awaited<ReturnType<typeof getFinancialSummary>>>

export default function FinancesAdminPage() {
  const [data, setData] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getFinancialSummary()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[var(--parabellum-primary)]" /></div>

  const metrics = [
    { name: 'Volume encaissé', value: `${(data?.totalVolume || 0).toLocaleString()} F`, icon: <Wallet />, color: 'text-[var(--parabellum-primary)]', bg: 'bg-[#eef1ff]', detail: `${data?.transactions.length || 0} transactions récentes` },
    { name: 'Commissions réelles', value: `${(data?.totalCommission || 0).toLocaleString()} F`, icon: <DollarSign />, color: 'text-[var(--parabellum-success)]', bg: 'bg-[#e8f9ee]', detail: `${(data?.averageCommissionRate || 0).toFixed(1)}% moyen` },
    { name: 'Net restaurateurs', value: `${(data?.totalNetToRestaurants || 0).toLocaleString()} F`, icon: <ArrowDownRight />, color: 'text-[var(--parabellum-warning)]', bg: 'bg-[#fff7df]', detail: `${data?.stores.length || 0} restaurants` },
  ]

  return (
    <div className="mx-auto max-w-[96rem] space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Finances & Commissions</h1>
          <p className="mt-2 text-base font-medium text-[#72788f]">Suivi des flux monétaires et revenus de la plateforme</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="/api/exports/finances?format=pdf" className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-primary)] shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] transition-all hover:bg-[#eef1ff] sm:w-auto sm:px-6">
            <Download className="w-4 h-4" /> PDF
          </a>
          <a href="/api/exports/finances?format=xls" className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-primary)] shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] transition-all hover:bg-[#eef1ff] sm:w-auto sm:px-6">
            <Download className="w-4 h-4" /> Excel
          </a>
          <button disabled className="w-full rounded-xl bg-[#8a92a6] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all sm:w-auto sm:px-8">
            Versements à configurer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        {metrics.map((m) => (
          <div key={m.name} className="group rounded-xl bg-white p-6 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${m.bg} ${m.color}`}>
                {React.cloneElement(m.icon as React.ReactElement<{ className?: string }>, { className: 'w-7 h-7' })}
              </div>
              <span className="rounded-lg bg-[#f8f9ff] px-2 py-1 text-[10px] font-black text-[#72788f]">{m.detail}</span>
            </div>
            <h3 className="mb-2 text-sm font-bold uppercase text-[#72788f]">{m.name}</h3>
            <p className="text-2xl font-black tracking-tight text-black sm:text-3xl">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        {/* Transactions Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] lg:col-span-2">
          <div className="flex flex-col gap-4 border-b border-[#f0f1f6] p-7 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-2xl font-black text-black">Transactions Récentes</h3>
            <Filter className="w-4 h-4 cursor-pointer text-[var(--parabellum-primary)]" />
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
                {data?.transactions.map((t) => (
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
        <div className="parabellum-gradient rounded-xl p-7 text-white shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8">Revenue par Store</h3>
          <div className="space-y-6">
            {data?.stores.map((s) => (
              <div key={s.id} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span>{s.name}</span>
                  <span>{s.revenue.toLocaleString()} F</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#339af0]" style={{ width: `${Math.max(4, Math.round((s.revenue / Math.max(...data.stores.map((store) => store.revenue), 1)) * 100))}%` }} />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">
                  Commission {s.commissionRate}%: {s.commission.toLocaleString()} F
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="rounded-[1.75rem] bg-white/5 p-5 sm:p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Net total restaurateurs</h4>
              <p className="text-2xl font-black mb-4">{(data?.totalNetToRestaurants || 0).toLocaleString()} F</p>
              <button disabled className="w-full bg-white/10 text-white/60 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">
                Module versement non activé
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
