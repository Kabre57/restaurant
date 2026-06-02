'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, ArrowDownRight, DollarSign, Download, Filter, Loader2, Plus, Calendar, FileText, CheckCircle2 } from 'lucide-react'
import { getFinancialSummary } from '@/app/actions/finances'
import { getPayoutSummary, createPayout, getPayoutHistory } from '@/app/actions/payouts'
import { format } from 'date-fns'

type FinancialSummary = NonNullable<Awaited<ReturnType<typeof getFinancialSummary>>>
type PayoutSummaryType = Awaited<ReturnType<typeof getPayoutSummary>>
type PayoutHistoryType = Awaited<ReturnType<typeof getPayoutHistory>>

export default function FinancesAdminPage() {
  const [data, setData] = useState<FinancialSummary | null>(null)
  const [payoutSummaries, setPayoutSummaries] = useState<PayoutSummaryType>([])
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryType>([])
  const [loading, setLoading] = useState(true)
  const [payoutLoading, setPayoutLoading] = useState(true)

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function loadData() {
    try {
      const summary = await getFinancialSummary()
      setData(summary)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPayouts() {
    try {
      const [sums, hist] = await Promise.all([
        getPayoutSummary(),
        getPayoutHistory()
      ])
      setPayoutSummaries(sums)
      setPayoutHistory(hist)
    } catch (err) {
      console.error(err)
    } finally {
      setPayoutLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    loadPayouts()
  }, [])

  async function handlePayoutSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    if (!selectedStore) {
      setErrorMsg('Veuillez sélectionner un restaurant.')
      return
    }
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Montant invalide.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createPayout(selectedStore, val, note)
      if (res.success) {
        setSuccessMsg('Versement enregistré avec succès !')
        setAmount('')
        setNote('')
        setSelectedStore('')
        // Reload everything
        await Promise.all([loadData(), loadPayouts()])
        setTimeout(() => setIsModalOpen(false), 1500)
      } else {
        setErrorMsg(res.error || 'Une erreur est survenue.')
      }
    } catch (err) {
      setErrorMsg('Erreur serveur lors de l\'enregistrement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[var(--parabellum-primary)]" /></div>

  const metrics = [
    { name: 'Volume encaissé', value: `${(data?.totalVolume || 0).toLocaleString()} F`, icon: <Wallet />, color: 'text-[var(--parabellum-primary)]', bg: 'bg-[#eef1ff]', detail: `${data?.transactions.length || 0} transactions récentes` },
    { name: 'Commissions réelles', value: `${(data?.totalCommission || 0).toLocaleString()} F`, icon: <DollarSign />, color: 'text-[var(--parabellum-success)]', bg: 'bg-[#e8f9ee]', detail: `${(data?.averageCommissionRate || 0).toFixed(1)}% moyen` },
    { name: 'Net restaurateurs (Total)', value: `${(data?.totalNetToRestaurants || 0).toLocaleString()} F`, icon: <ArrowDownRight />, color: 'text-[var(--parabellum-warning)]', bg: 'bg-[#fff7df]', detail: `${data?.stores.length || 0} restaurants` },
  ]

  return (
    <div className="mx-auto max-w-[96rem] space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Finances & Commissions</h1>
          <p className="mt-2 text-base font-medium text-[#72788f]">Suivi des flux monétaires, commissions et versements partenaires</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="/api/exports/finances?format=pdf" className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-primary)] shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] transition-all hover:bg-[#eef1ff] sm:w-auto sm:px-6">
            <Download className="w-4 h-4" /> PDF
          </a>
          <a href="/api/exports/finances?format=xls" className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-primary)] shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] transition-all hover:bg-[#eef1ff] sm:w-auto sm:px-6">
            <Download className="w-4 h-4" /> Excel
          </a>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:opacity-90 sm:w-auto sm:px-8"
          >
            <Plus className="w-4 h-4" /> Effectuer un versement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
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
                      <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">{t.paymentMethod?.name || 'Inconnu'}</span>
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
        <div className="parabellum-gradient rounded-xl p-7 text-white shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-8">Revenue & Net par Store</h3>
            <div className="space-y-6">
              {data?.stores.map((s) => {
                const payoutData = payoutSummaries.find(ps => ps.storeId === s.id)
                return (
                  <div key={s.id} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span>{s.name}</span>
                      <span>{s.revenue.toLocaleString()} F</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#339af0]" style={{ width: `${Math.max(4, Math.round((s.revenue / Math.max(...data.stores.map((store) => store.revenue), 1)) * 100))}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/60">
                      <span>Comm {s.commissionRate}%: {s.commission.toLocaleString()} F</span>
                      <span className="text-[var(--parabellum-warning)]">Dû: {payoutData ? Math.round(payoutData.netDue).toLocaleString() : 0} F</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="rounded-[1.75rem] bg-white/5 p-5 sm:p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Net global à verser</h4>
              <p className="text-2xl font-black mb-4">
                {payoutSummaries.reduce((sum, store) => sum + store.netDue, 0).toLocaleString()} F
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-white text-[var(--parabellum-primary)] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-95 transition-all"
              >
                Gérer les versements
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payouts Section */}
      <div className="rounded-xl bg-white shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] p-7 space-y-6">
        <h3 className="text-2xl font-black text-black">Historique des Versements Restaurateurs</h3>
        {payoutLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--parabellum-primary)]" /></div>
        ) : payoutHistory.length === 0 ? (
          <p className="text-sm font-medium text-[#72788f] py-4 text-center">Aucun versement n'a encore été effectué.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-[#f8f9fa] text-left">
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Restaurant</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Montant</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Note / Justificatif</th>
                  <th className="px-8 py-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {payoutHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f8f9fa] transition-all">
                    <td className="px-8 py-5 text-xs font-bold text-[#72788f]">
                      {format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-[#212529]">{p.store.name}</span>
                    </td>
                    <td className="px-8 py-5 text-xs font-black text-[var(--parabellum-primary)]">
                      {p.amount.toLocaleString()} F
                    </td>
                    <td className="px-8 py-5 text-xs font-medium text-[#72788f]">
                      {p.note || '—'}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1 text-[var(--parabellum-success)] font-black text-[9px] uppercase tracking-widest">
                        <CheckCircle2 className="w-4 h-4" /> COMPLÉTÉ
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-black">Nouveau Versement</h3>
            
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 font-bold text-xs">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-4 rounded-xl bg-green-50 text-green-600 font-bold text-xs">
                {successMsg}
              </div>
            )}

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Choisir un restaurant</label>
                <select 
                  value={selectedStore} 
                  onChange={(e) => {
                    setSelectedStore(e.target.value)
                    const storeData = payoutSummaries.find(ps => ps.storeId === e.target.value)
                    if (storeData) {
                      setAmount(Math.round(storeData.netDue).toString())
                    }
                  }}
                  className="w-full p-4 rounded-xl border border-[#e2e8f0] bg-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                >
                  <option value="">Sélectionner...</option>
                  {payoutSummaries.map((ps) => (
                    <option key={ps.storeId} value={ps.storeId}>
                      {ps.storeName} (Solde dû : {Math.round(ps.netDue).toLocaleString()} F)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Montant du versement (FCFA)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-4 rounded-xl border border-[#e2e8f0] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Note / Référence du virement</label>
                <input 
                  type="text"
                  placeholder="Ex: Virement Wave #82949, Chèque N°029492..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-4 rounded-xl border border-[#e2e8f0] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-[#f1f3f5] hover:bg-[#e2e8f0] text-black font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[var(--parabellum-primary)] hover:opacity-90 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
