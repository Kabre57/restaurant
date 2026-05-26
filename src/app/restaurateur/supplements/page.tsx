'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, X, Loader2, Tag, ChevronDown, ChefHat, MinusCircle, AlertCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getCategories } from '@/app/actions/products'
import { getProductOptions, createProductOption, deleteProductOption } from '@/app/actions/productOptions'
import { CrudActionButton, CrudFilterBar, CrudPrimaryButton, CrudStatus, CrudTable } from '@/components/ui/ParabellumCrudTable'

type CategoryItem = {
  id: string
  name: string
}

type SupplementOption = {
  id: string
  name: string
  price: number
  categoryId: string | null
  storeId: string
  type: 'SUPPLEMENT' | 'REMOVAL'
}

export default function SupplementsManagement() {
  const { data: session } = useSession()
  const [options, setOptions] = useState<SupplementOption[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('') // '' = ALL, 'SUPPLEMENT', 'REMOVAL'

  const [formData, setFormData] = useState({
    name: '',
    price: '0',
    type: 'SUPPLEMENT' as 'SUPPLEMENT' | 'REMOVAL',
    categoryId: ''
  })

  // Load Categories and Options when storeId is available
  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return

    let isCancelled = false

    async function fetchData() {
      setLoading(true)
      try {
        const [catsData, optsData] = await Promise.all([
          getCategories(storeId),
          getProductOptions(storeId as string)
        ])
        if (isCancelled) return
        setCategories(catsData as CategoryItem[])
        setOptions(optsData as SupplementOption[])
      } catch (err) {
        console.error("Failed to load data:", err)
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  async function loadOptions() {
    const storeId = session?.user?.storeId
    if (!storeId) return
    const optsData = await getProductOptions(storeId)
    setOptions(optsData as SupplementOption[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const storeId = session?.user?.storeId
    if (!storeId) {
      setErrorModal("Session expirée. Veuillez vous reconnecter.")
      return
    }

    if (!formData.name.trim()) {
      setErrorModal("Le nom de l'option est requis.")
      return
    }

    setIsSubmitting(true)
    const price = formData.type === 'SUPPLEMENT' ? parseFloat(formData.price) || 0 : 0
    const categoryId = formData.categoryId ? formData.categoryId : null

    const res = await createProductOption({
      storeId,
      name: formData.name.trim(),
      price,
      categoryId,
      type: formData.type
    })

    if (res.success) {
      setShowModal(false)
      setFormData({ name: '', price: '0', type: 'SUPPLEMENT', categoryId: '' })
      await loadOptions()
    } else {
      setErrorModal(res.error || "Erreur lors de la création")
    }
    setIsSubmitting(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteProductOption(id)
    if (res.success) {
      await loadOptions()
    } else {
      setErrorModal(res.error || "Erreur lors de la suppression")
    }
  }

  const visibleOptions = options.filter((opt) => {
    const matchesSearch = opt.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = !filterType || opt.type === filterType
    return matchesSearch && matchesType
  })

  const totalCount = options.length
  const supplementCount = options.filter(o => o.type === 'SUPPLEMENT').length
  const removalCount = options.filter(o => o.type === 'REMOVAL').length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Suppléments & Retraits</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez les suppléments et options de retrait pour vos produits</p>
        </div>
        <CrudPrimaryButton
          onClick={() => {
            setFormData({ name: '', price: '0', type: 'SUPPLEMENT', categoryId: '' });
            setShowModal(true);
          }}
        >
          Ajouter Option
        </CrudPrimaryButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e5e7ef] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Options totales</span>
            <div className="rounded-xl bg-[#2f4cdd]/10 p-2.5 text-[var(--parabellum-primary)]"><Tag className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 text-2xl font-black text-black">{totalCount}</div>
        </div>
        <div className="rounded-2xl border border-[#e5e7ef] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Suppléments</span>
            <div className="rounded-xl bg-[#2fbe5f]/10 p-2.5 text-[#2fbe5f]"><ChefHat className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 text-2xl font-black text-[#2fbe5f]">{supplementCount}</div>
        </div>
        <div className="rounded-2xl border border-[#e5e7ef] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Retraits</span>
            <div className="rounded-xl bg-[#f72559]/10 p-2.5 text-[#f72559]"><MinusCircle className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 text-2xl font-black text-[#f72559]">{removalCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <CrudFilterBar
        searchValue={search}
        searchPlaceholder="Rechercher par nom d'option"
        onSearchChange={setSearch}
        statusValue={filterType}
        statusOptions={[
          { value: 'SUPPLEMENT', label: 'Suppléments (+ prix)' },
          { value: 'REMOVAL', label: 'Retraits (sans prix)' }
        ]}
        onStatusChange={setFilterType}
        onReset={() => {
          setSearch('');
          setFilterType('');
        }}
      />

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <CrudTable
          title="Liste des options de personnalisation"
          rows={visibleOptions}
          emptyLabel="Aucun supplément ou retrait trouvé"
          columns={[
            { key: 'serial', label: 'N°' },
            { key: 'type', label: 'Type' },
            { key: 'name', label: 'Nom de l\'option' },
            { key: 'price', label: 'Prix Additionnel' },
            { key: 'category', label: 'Catégorie Associée' },
            { key: 'actions', label: 'Actes', className: 'text-right' },
          ]}
          footerLabel={`Affichage de ${visibleOptions.length} option${visibleOptions.length > 1 ? 's' : ''} sur ${options.length} au total.`}
          renderRow={(option, index) => {
            const associatedCategory = categories.find(c => c.id === option.categoryId)
            return (
              <tr key={option.id} className="transition hover:bg-[#fafbfc]">
                <td className="px-6 py-4 text-sm font-bold text-[#72788f]">{index + 1}</td>
                <td className="px-6 py-4">
                  {option.type === 'SUPPLEMENT' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#2fbe5f] border border-green-200">
                      <ChefHat className="h-3 w-3" />
                      Supplément
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#f72559] border border-red-200">
                      <MinusCircle className="h-3 w-3" />
                      Retrait
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-[#495057]">{option.name}</td>
                <td className="px-6 py-4 text-sm font-black text-[var(--parabellum-primary)]">
                  {option.type === 'SUPPLEMENT' ? `+ ${option.price.toLocaleString()} FCFA` : 'Gratuit'}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-[#72788f] uppercase tracking-wider">
                  {associatedCategory ? associatedCategory.name : 'Toutes les catégories'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <CrudActionButton label="Supprimer l'option" tone="delete" onClick={() => setDeleteTarget(option.id)} />
                  </div>
                </td>
              </tr>
            )
          }}
        />
      )}

      {/* CRUD Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouvelle Option</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Définissez une option de personnalisation</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Type d'option</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'SUPPLEMENT' })}
                    className={`flex-1 rounded-xl border py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.type === 'SUPPLEMENT'
                        ? 'bg-green-500 text-white border-transparent shadow-lg shadow-green-500/20'
                        : 'bg-white text-[#868e96] border-[#dee2e6] hover:border-green-300'
                    }`}
                  >
                    + Supplément
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'REMOVAL', price: '0' })}
                    className={`flex-1 rounded-xl border py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.type === 'REMOVAL'
                        ? 'bg-red-500 text-white border-transparent shadow-lg shadow-red-500/20'
                        : 'bg-white text-[#868e96] border-[#dee2e6] hover:border-red-300'
                    }`}
                  >
                    − Retrait
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom de l'option</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
                  placeholder={formData.type === 'SUPPLEMENT' ? "Ex: Double Cheddar" : "Ex: Sans Oignon"}
                />
              </div>

              {/* Price */}
              {formData.type === 'SUPPLEMENT' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Prix additionnel (FCFA)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="50"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
                    placeholder="Ex: 500"
                  />
                </div>
              )}

              {/* Associated Category */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Catégorie associée</label>
                <div className="relative">
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full appearance-none bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] cursor-pointer pr-10"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[#adb5bd]" />
                </div>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]"
              >
                {isSubmitting ? "Enregistrement..." : "Créer l'option"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer cette option ? Cette action est irréversible.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-[#e03131] hover:bg-[#c92a2a] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <button onClick={() => setErrorModal(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Erreur</h2>
            <p className="text-sm font-bold text-[#495057] mb-8 leading-relaxed">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">J&apos;ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}
