'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, ShieldCheck, Store, UserCog, Wallet } from 'lucide-react'
import { createFranchiseurAccount, getFranchiseurAccounts } from '@/app/actions/franchiseurs'
import { getPendingValidations } from '@/app/actions/admin'
import { getStores } from '@/app/actions/stores'

type FranchiseurRow = Awaited<ReturnType<typeof getFranchiseurAccounts>>[number]
type StoreRow = Awaited<ReturnType<typeof getStores>>[number]
type ValidationStats = Awaited<ReturnType<typeof getPendingValidations>>

const initialForm = { name: '', email: '', password: '' }

export default function AdminFranchiseursPage() {
  const [accounts, setAccounts] = useState<FranchiseurRow[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [validations, setValidations] = useState<ValidationStats | null>(null)
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function refreshData() {
    const [accountRows, storeRows, validationRows] = await Promise.all([
      getFranchiseurAccounts(),
      getStores(),
      getPendingValidations(),
    ])
    setAccounts(accountRows)
    setStores(storeRows)
    setValidations(validationRows)
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([getFranchiseurAccounts(), getStores(), getPendingValidations()])
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

    const result = await createFranchiseurAccount(form)

    if (result.success) {
      setForm(initialForm)
      setMessage('Compte Franchiseur créé avec accès multi-sites.')
      await refreshData()
    } else {
      setMessage(result.error || 'Création impossible.')
    }

    setIsSaving(false)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#f08c00]">Super-admin plateforme</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-[#212529] sm:text-3xl">
          Comptes Franchiseurs
        </h1>
        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-[#adb5bd]">
          Multi-sites, commissions et validations sans rattachement à un restaurant unique.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Store} label="Restaurants supervisés" value={stores.length} />
        <SummaryCard icon={Wallet} label="Commission moyenne" value={`${commissionAverage}%`} />
        <SummaryCard icon={CheckCircle2} label="Validations en attente" value={validations?.totalPending ?? 0} />
      </section>

      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f3f5]">
            <UserCog className="h-5 w-5 text-[#212529]" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Nouveau Franchiseur</h2>
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
          <p className="text-xs font-bold text-[#868e96]">{message}</p>
          <button
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#212529] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Créer le compte
          </button>
        </div>
      </form>

      <section className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Franchiseurs existants</h2>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#adb5bd]" /></div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {accounts.map((account) => (
              <article key={account.id} className="rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-[#212529]">{account.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#868e96]">{account.email}</p>
                  </div>
                  <span className="rounded-lg bg-[#e7f5ff] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#1971c2]">
                    Multi-sites
                  </span>
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Statut: approuvé</p>
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
      <span className="ml-1 block text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-[#212529]"
      />
    </label>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: number | string }) {
  return (
    <article className="rounded-2xl border border-[#dee2e6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">{label}</p>
          <p className="mt-2 text-2xl font-black text-[#212529]">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f3f5]">
          <Icon className="h-5 w-5 text-[#212529]" />
        </div>
      </div>
    </article>
  )
}
