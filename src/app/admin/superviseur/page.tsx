'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, ShieldCheck, Store, UserCog, Wallet } from 'lucide-react'
import { createSuperviseurAccount, getSuperviseurAccounts } from '@/app/actions/superviseur/superviseur'
import { getPendingValidations } from '@/app/actions/analytics/admin'
import { getStores } from '@/app/actions/store/stores'

type SuperviseurRow = Awaited<ReturnType<typeof getSuperviseurAccounts>>[number]
type StoreRow = Awaited<ReturnType<typeof getStores>>[number]
type ValidationStats = Awaited<ReturnType<typeof getPendingValidations>>

const initialForm = { name: '', email: '', password: '' }

export default function AdminSuperviseurPage() {
  const [accounts, setAccounts] = useState<SuperviseurRow[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [validations, setValidations] = useState<ValidationStats | null>(null)
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function refreshData() {
    const [accountRows, storeRows, validationRows] = await Promise.all([
      getSuperviseurAccounts(),
      getStores(),
      getPendingValidations(),
    ])
    setAccounts(accountRows)
    setStores(storeRows)
    setValidations(validationRows)
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([getSuperviseurAccounts(), getStores(), getPendingValidations()])
      .then(([accountRows, storeRows, validationRows]) => {
        if (cancelled) return
        setAccounts(accountRows)
        setStores(storeRows)
        setValidations(validationRows)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const commissionAverage = useMemo(() => {
    if (!stores.length) return 0
    const total = stores.reduce((sum, store) => sum + Number(store.commission || 0), 0)
    return Math.round((total / stores.length) * 10) / 10
  }, [stores])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')

    const result = await createSuperviseurAccount(form)

    if (result.success) {
      setForm(initialForm)
      setMessage('Compte Superviseur créé avec accès multi-sites.')
      await refreshData()
    } else {
      setMessage(result.error || 'Création impossible.')
    }

    setIsSaving(false)
  }

  return (
    <div className="mx-auto max-w-[96rem] space-y-8 text-slate-900 dark:text-slate-100">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">Super-admin plateforme</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Comptes Superviseur
        </h1>
        <p className="mt-2 text-base font-medium text-slate-500 dark:text-slate-400">
          Multi-sites, commissions et validations sans rattachement à un restaurant unique.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Store} label="Restaurants supervisés" value={stores.length} />
        <SummaryCard icon={Wallet} label="Commission moyenne" value={`${commissionAverage}%`} />
        <SummaryCard icon={CheckCircle2} label="Validations en attente" value={validations?.totalPending ?? 0} />
      </section>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#FF6D00]">
            <UserCog className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Nouveau Superviseur</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nom complet" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" />
          <Field
            label="Mot de passe"
            value={form.password}
            onChange={(value) => setForm({ ...form, password: value })}
            type="password"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{message}</p>
          <button
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] hover:bg-orange-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md disabled:opacity-50 transition-all"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Créer le compte
          </button>
        </div>
      </form>

      <section className="rounded-2xl bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 p-7 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Superviseurs existants</h2>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" /></div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {accounts.map((account) => (
              <article key={account.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-5 transition-all hover:bg-white dark:hover:bg-slate-900/80 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">{account.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">{account.email}</p>
                  </div>
                  <span className="rounded-lg bg-orange-50 dark:bg-orange-950/30 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#FF6D00]">
                    Multi-sites
                  </span>
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Statut: approuvé</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="space-y-2">
      <span className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs font-bold outline-none transition-all text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-[#FF6D00]"
      />
    </label>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: number | string }) {
  return (
    <article className="rounded-2xl bg-white dark:bg-[#181a20] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#FF6D00]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  )
}
