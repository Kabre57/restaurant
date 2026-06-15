'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Layers, Loader2, Upload, X } from 'lucide-react'
import { createAdminCategory, deleteAdminCategory, getAdminCategories } from '@/app/actions/catalog/adminCategories'
import { getStores } from '@/app/actions/store/stores'
import { CrudActionButton, CrudFilterBar, CrudPrimaryButton, CrudStatus, CrudTable } from '@/components/ui/ParabellumCrudTable'

type CategoryRow = Awaited<ReturnType<typeof getAdminCategories>>[number]
type StoreRow = Awaited<ReturnType<typeof getStores>>[number]

const initialForm = { name: '', storeId: '', imageUrl: '' }

function readAdminActiveStoreId() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(^| )admin_active_store_id=([^;]*)/)
  return match ? decodeURIComponent(match[2]) : localStorage.getItem('admin_active_store_id') || ''
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [activeStoreId, setActiveStoreId] = useState('')
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, imageUrl: reader.result as string }))
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  async function refreshData(storeId = activeStoreId) {
    const [categoryRows, storeRows] = await Promise.all([getAdminCategories(storeId || undefined), getStores()])
    setCategories(categoryRows)
    setStores(storeRows)
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      const storeRows = await getStores()
      const storedStoreId = readAdminActiveStoreId()
      const nextStoreId = storeRows.some((store) => store.id === storedStoreId)
        ? storedStoreId
        : storeRows[0]?.id || ''
      const categoryRows = await getAdminCategories(nextStoreId || undefined)

      if (cancelled) return
      setActiveStoreId(nextStoreId)
      setCategories(categoryRows)
      setStores(storeRows)
      setForm((current) => ({ ...current, storeId: nextStoreId }))
    }

    loadInitialData()
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
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
      setForm({ ...initialForm, storeId: activeStoreId || stores[0]?.id || '' })
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

  const visibleCategories = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(search.toLowerCase()) || category.store.name.toLowerCase().includes(search.toLowerCase())
    const matchesStore = storeFilter ? category.storeId === storeFilter : true
    return matchesSearch && matchesStore
  })

  return (
    <div className="mx-auto max-w-[96rem] space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Gestion des Catégories</h1>
          <p className="mt-2 text-base font-medium text-[#72788f]">Catégories réelles par restaurant</p>
        </div>
        <CrudPrimaryButton onClick={() => setShowAddModal(true)}>
          Créer une catégorie
        </CrudPrimaryButton>
      </div>

      <CrudFilterBar
        searchValue={search}
        searchPlaceholder="Nom catégorie ou restaurant"
        statusValue={storeFilter}
        statusOptions={stores.map((store) => ({ value: store.id, label: store.name }))}
        onSearchChange={setSearch}
        onStatusChange={setStoreFilter}
        onReset={() => {
          setSearch('')
          setStoreFilter('')
        }}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <CrudTable
          title="Liste des catégories"
          rows={visibleCategories}
          emptyLabel="Aucune catégorie enregistrée"
          columns={[
            { key: 'serial', label: 'N° de série' },
            { key: 'title', label: 'Titre' },
            { key: 'restaurant', label: 'Restaurant' },
            { key: 'products', label: 'Produits' },
            { key: 'status', label: 'Statut' },
            { key: 'actions', label: 'Actes', className: 'text-right' },
          ]}
          footerLabel={`Page 1 sur 1, affichant ${visibleCategories.length} catégorie${visibleCategories.length > 1 ? 's' : ''} sur ${categories.length} au total.`}
          renderRow={(cat, index) => (
            <tr key={cat.id} className="transition hover:bg-[#fafbfc]">
              <td className="px-6 py-4 text-sm font-bold text-[#72788f]">{index + 1}</td>
              <td className="px-6 py-4 text-sm font-bold text-[#495057]">{cat.name}</td>
              <td className="px-6 py-4 text-sm font-medium text-[#72788f]">{cat.store.name}</td>
              <td className="px-6 py-4 text-sm font-black text-black">{cat._count.products}</td>
              <td className="px-6 py-4"><CrudStatus>Active</CrudStatus></td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <CrudActionButton label="Supprimer la catégorie" tone="delete" onClick={() => void handleDelete(cat.id)} />
                </div>
              </td>
            </tr>
          )}
        />
      )}
      {message && <p className="text-xs font-bold text-[#e03131]">{message}</p>}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:p-10">
            <button onClick={() => setShowAddModal(false)} className="absolute right-4 top-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="h-6 w-6" /></button>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef1ff] text-[var(--parabellum-primary)]"><Layers className="h-8 w-8" /></div>
              <h2 className="text-xl font-black tracking-tight text-black">Nouvelle Catégorie</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Field label="Nom" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <label className="space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Restaurant</span>
                <select required value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })} className="w-full rounded-xl border border-[#e8eaf4] bg-[#f8f9ff] px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[var(--parabellum-primary)]">
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </label>
              <div className="space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Image de la Catégorie</span>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all ${form.imageUrl ? 'border-[#2f9e44] bg-[#ebfbee]' : 'border-[#e8eaf4] hover:border-[var(--parabellum-primary)] bg-[#f8f9ff]'}`}
                >
                  {form.imageUrl ? (
                    <div className="relative w-full h-32 rounded-xl bg-white shadow-sm overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.imageUrl} alt="Aperçu" className="max-h-full max-w-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer l'image</span>
                      </div>
                    </div>
                  ) : isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--parabellum-primary)]" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-[var(--parabellum-primary)] opacity-50" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Cliquez pour uploader</span>
                    </>
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
              <button disabled={isSaving} className="w-full rounded-xl bg-[var(--parabellum-primary)] py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-[#253ec7] disabled:opacity-50">
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
      <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#8a92a6]">{label}</span>
      <input required value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#e8eaf4] bg-[#f8f9ff] px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[var(--parabellum-primary)]" />
    </label>
  )
}
