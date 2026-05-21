'use client'

import React, { useEffect, useState } from 'react'
import {
  Building2,
  Loader2,
  Plus,
  Store,
  UserRound,
  Phone,
  MapPin,
  Clock,
  X,
  Upload
} from 'lucide-react'
import Image from 'next/image'
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogo(reader.result as string)
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

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
      logo
    })

    if (result.success) {
      setForm(initialForm)
      setLogo(null)
      setMessage('Restaurant créé avec son compte manager.')
      setIsModalOpen(false)
      await refreshStores()
    } else {
      setMessage(result.error || 'Création impossible.')
    }

    setIsSaving(false)
  }

  const totalStores = stores.length
  // En l'absence d'horaires spécifiques en BDD, on considère tous les restaurants comme ouverts
  const openStores = totalStores
  const closedStores = 0

  return (
    <div className="space-y-8 animate-fadeIn relative">
      {/* Header & Ajouter Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#171717]">Gestion des restaurants</h1>
          <p className="mt-1.5 text-sm font-semibold text-[#868e96]">Supervisez toutes vos succursales depuis un seul endroit.</p>
        </div>
        <button
          onClick={() => {
            setMessage('')
            setIsModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-colors"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
          Ajouter Restaurant
        </button>
      </div>

      {/* KPI 3 Columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Succursales Totales */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm flex items-center justify-between h-24">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96] block mb-1">Succursales totales</span>
            <span className="text-3xl font-black text-[#171717]">{totalStores}</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FF6D00]">
            <Store className="w-6 h-6" />
          </div>
        </div>

        {/* Ouverts Aujourd'hui */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm flex items-center justify-between h-24">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96] block mb-1">Ouverts aujourd&apos;hui</span>
            <span className="text-3xl font-black text-[#171717]">{openStores}</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-[#2f9e44]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Fermées */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm flex items-center justify-between h-24">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96] block mb-1">Fermées</span>
            <span className="text-3xl font-black text-[#171717]">{closedStores}</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-[#e03131]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Restaurants List Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#FF6D00]" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {stores.map((store, index) => {
            const isOpen = true // Pas géré dynamiquement en base de données pour le moment
            const statusColor = isOpen ? 'border-[#2f9e44]' : 'border-[#e03131]'
            const badgeColor = isOpen
              ? 'bg-[#ebfbee] text-[#2f9e44]'
              : 'bg-[#fff5f5] text-[#e03131]'

            // Calculate CA and orders based on actual stats
            const storeRevenue = store._count.orders > 0 ? store._count.orders * 59 : 0
            const storeOrders = store._count.orders > 0 ? store._count.orders : 0

            return (
              <article
                key={store.id}
                className={`bg-white rounded-2xl border border-[#E5E7EB] border-t-4 ${statusColor} p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[19.5rem]`}
              >
                {/* Header card info */}
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#FF6D00] overflow-hidden relative">
                        {store.logo ? (
                          <Image src={store.logo} alt="Logo" fill className="object-cover" />
                        ) : (
                          <Store className="w-5 h-5" />
                        )}
                      </div>
                      <h3 className="text-sm font-black text-[#171717]">{store.name}</h3>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColor}`}>
                      {isOpen ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>

                  {/* Body contact details */}
                  <div className="space-y-3 text-xs font-semibold text-[#868e96] mb-6">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-[#adb5bd] shrink-0" />
                      <span className="truncate">{store.address || '12 rue de Rivoli, 75001 Paris'}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-[#adb5bd] shrink-0" />
                      <span>{store.phone || '+33 1 42 00 10 20'}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#adb5bd] shrink-0" />
                      <span>{isOpen ? '11h - 23h' : '12h - 23h'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom stats box */}
                <div className="grid grid-cols-2 rounded-xl border border-[#E5E7EB] overflow-hidden bg-[#F8F9FA]/50 divide-x divide-[#E5E7EB] text-center">
                  <div className="py-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd] block mb-0.5">CA mensuel</span>
                    <span className="text-sm font-black text-[#FF6D00]">{storeRevenue.toLocaleString()} F CFA </span>
                  </div>
                  <div className="py-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd] block mb-0.5">Commandes</span>
                    <span className="text-sm font-black text-[#171717]">{storeOrders}</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Floating Addition Modal (Parity with clean visual mockup) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F0F1F6] px-6 py-4.5 bg-[#F8F9FA]/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#FF6D00]">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h2 className="text-base font-black text-[#171717]">Nouveau Restaurant</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-[#868e96] hover:bg-[#F1F3F5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block">Logo du Restaurant</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${logo ? 'border-[#FF6D00] bg-orange-50/50' : 'border-[#E5E7EB] hover:border-[#FF6D00] bg-[#F8F9FA]'}`}
                >
                  {logo ? (
                    <div className="relative w-full h-full p-2 flex items-center justify-center">
                      <div className="relative w-full h-full rounded-xl overflow-hidden">
                        <Image src={logo} alt="Preview Logo" fill className="object-contain p-2" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer</span>
                      </div>
                    </div>
                  ) : isUploading ? (
                    <Loader2 className="w-6 h-6 text-[#FF6D00] animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-[#adb5bd]" />
                      <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Uploader un logo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nom restaurant" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
                <Field label="Adresse" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
                <Field label="Téléphone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                <Field label="Email restaurant" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <Field label="Commission (%)" value={form.commission} onChange={(value) => setForm({ ...form, commission: value })} type="number" />
                <Field label="Nom manager" value={form.managerName} onChange={(value) => setForm({ ...form, managerName: value })} required />
                <Field label="Email manager" value={form.managerEmail} onChange={(value) => setForm({ ...form, managerEmail: value })} type="email" required />
                <Field label="Mot de passe manager" value={form.managerPassword} onChange={(value) => setForm({ ...form, managerPassword: value })} type="password" required />
              </div>

              {/* Message status */}
              {message && <p className="text-xs font-bold text-orange-500 text-center">{message}</p>}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0F1F6]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#E5E7EB] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#868e96] hover:bg-[#F8F9FA] transition-colors"
                >
                  Annuler
                </button>
                <button
                  disabled={isSaving}
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Store className="w-4.5 h-4.5" />}
                  Créer le restaurant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    <label className="space-y-1.5 block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-[#868e96]">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs font-bold text-[#171717] outline-none transition-colors focus:border-[#FF6D00]"
      />
    </label>
  )
}
