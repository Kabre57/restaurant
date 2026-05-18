'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Layers, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import { createAdminCategory, deleteAdminCategory, getAdminCategories } from '@/app/actions/adminCategories'
import { getStores } from '@/app/actions/stores'

type CategoryRow = Awaited<ReturnType<typeof getAdminCategories>>[number]
type StoreRow = Awaited<ReturnType<typeof getStores>>[number]

const initialForm = { name: '', storeId: '', imageUrl: '' }

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  async function refreshData() {
    const [categoryRows, storeRows] = await Promise.all([getAdminCategories(), getStores()])
    setCategories(categoryRows)
    setStores(storeRows)
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([getAdminCategories(), getStores()])
      .then(([categoryRows, storeRows]) => {
        if (cancelled) return
        setCategories(categoryRows)
        setStores(storeRows)
        setForm((current) => ({ ...current, storeId: storeRows[0]?.id || '' }))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')

    const result = await createAdminCategory(form)
    if (result.success) {
      setForm({ ...initialForm, storeId: stores[0]?.id || '' })
      setShowAddModal(false)
      await refreshData()
    } else {
      setMessage(result.error || 'Création impossible.')
    }

    setIsSaving(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteAdminCategory(id)
    if (!result.success) {
      setMessage(result.error || 'Suppression impossible.')
      return
    }
    await refreshData()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-0 sm:py-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] sm:text-3xl">Gestion des Catégories</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-[#adb5bd]">Catégories réelles par restaurant</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#212529] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black sm:w-auto">
          <Plus className="h-5 w-5" />
          Créer une catégorie
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && <div className="col-span-full flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-[#adb5bd]" /></div>}
        {!isLoading && categories.map((cat) => (
          <div key={cat.id} className="group overflow-hidden rounded-[2rem] border border-[#dee2e6] bg-white transition-all hover:shadow-2xl">
            <div className="relative h-40 overflow-hidden bg-[#f1f3f5]">
              {cat.imageUrl ? (
                <Image src={cat.imageUrl} alt={cat.name} fill unoptimized className="object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#adb5bd]"><Layers className="h-10 w-10" /></div>
              )}
              <button onClick={() => void handleDelete(cat.id)} className="absolute right-4 top-4 rounded-xl bg-white/20 p-2 text-white backdrop-blur-md transition-all hover:bg-[#e03131] sm:opacity-0 sm:group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="mb-1 text-sm font-black uppercase tracking-tight text-[#212529]">{cat.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">{cat._count.products} produits rattachés</p>
              <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-[#f08c00]">{cat.store.name}</p>
            </div>
          </div>
        ))}
        {!isLoading && categories.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-[#dee2e6] bg-white p-10 text-center text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
            Aucune catégorie enregistrée
          </p>
        )}
      </div>
      {message && <p className="text-xs font-bold text-[#e03131]">{message}</p>}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-10">
            <button onClick={() => setShowAddModal(false)} className="absolute right-4 top-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="h-6 w-6" /></button>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f1f3f5]"><Layers className="h-8 w-8 text-[#212529]" /></div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#212529]">Nouvelle Catégorie</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Field label="Nom" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <label className="space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Restaurant</span>
                <select required value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })} className="w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#212529]">
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </label>
              <div className="space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Image URL</span>
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#dee2e6] bg-[#f8f9fa] p-6">
                  <Upload className="h-6 w-6 text-[#adb5bd]" />
                  <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." className="w-full rounded-xl border border-[#dee2e6] bg-white px-4 py-3 text-xs font-bold outline-none" />
                </div>
              </div>
              <button disabled={isSaving} className="w-full rounded-2xl bg-[#212529] py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black disabled:opacity-50">
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">{label}</span>
      <input required value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#212529]" />
    </label>
  )
}
