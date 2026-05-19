'use client'

import React, { useEffect, useState } from 'react'
import { Building2, Loader2, Plus, Store, UserRound } from 'lucide-react'
import { createStore, getStores } from '@/app/actions/stores'

type StoreRow = Awaited<ReturnType<typeof getStores>>[number]

const initialForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
  commission: '15',
  managerName: '',
  managerEmail: '',
  managerPassword: '',
}

export default function AdminRestaurantsPage() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    getStores().then((data) => {
      if (cancelled) return
      setStores(data)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshStores() {
    setStores(await getStores())
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')

    const result = await createStore({
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email,
      commission: Number(form.commission || 15),
      managerName: form.managerName,
      managerEmail: form.managerEmail,
      managerPassword: form.managerPassword,
    })

    if (result.success) {
      setForm(initialForm)
      setMessage('Restaurant créé avec son compte manager.')
      await refreshStores()
    } else {
      setMessage(result.error || 'Création impossible.')
    }

    setIsSaving(false)
  }

  return (
    <div className="mx-auto max-w-[96rem] space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-primary)]">Franchiseur</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">Restaurants</h1>
        <p className="mt-2 text-base font-medium text-[#72788f]">
          Créez et supervisez plusieurs restaurants depuis la plateforme.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef1ff] text-[var(--parabellum-primary)]">
            <Plus className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-black">Nouveau restaurant</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Nom restaurant" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <Field label="Adresse" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
          <Field label="Téléphone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <Field label="Email restaurant" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <Field label="Commission (%)" value={form.commission} onChange={(value) => setForm({ ...form, commission: value })} type="number" />
          <Field label="Nom manager" value={form.managerName} onChange={(value) => setForm({ ...form, managerName: value })} required />
          <Field label="Email manager" value={form.managerEmail} onChange={(value) => setForm({ ...form, managerEmail: value })} type="email" required />
          <Field label="Mot de passe manager" value={form.managerPassword} onChange={(value) => setForm({ ...form, managerPassword: value })} type="password" required />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-[#868e96]">{message}</p>
          <button
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
            Créer le restaurant
          </button>
        </div>
      </form>

      <section className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-[var(--parabellum-primary)]" />
          <h2 className="text-lg font-black text-black">Restaurants existants</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#adb5bd]" /></div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {stores.map((store) => (
              <article key={store.id} className="rounded-xl border border-[#e8eaf4] bg-[#f8f9ff] p-5 transition-all hover:bg-white hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-black">{store.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#72788f]">{store.address || 'Adresse non renseignée'}</p>
                  </div>
                  <span className="rounded-lg bg-[#eef1ff] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--parabellum-primary)]">
                    {store.commission}% commission
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Produits" value={store._count.products} />
                  <Metric label="Tables" value={store._count.tables} />
                  <Metric label="Commandes" value={store._count.orders} />
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#50576f]">
                  <UserRound className="h-4 w-4 text-[var(--parabellum-primary)]" />
                  {store.users[0]?.email || 'Aucun manager'}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="space-y-2">
      <span className="ml-1 block text-[10px] font-black uppercase tracking-widest text-[#8a92a6]">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#e8eaf4] bg-[#f8f9ff] px-4 py-3 text-xs font-bold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[var(--parabellum-primary)]"
      />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-lg font-black text-black">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-[#8a92a6]">{label}</p>
    </div>
  )
}
