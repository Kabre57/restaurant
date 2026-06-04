'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, X, Loader2, Tag, ChevronDown, Sliders, MinusCircle, AlertCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getCategories } from '@/app/actions/products'
import { getProductOptions, createProductOption, deleteProductOption } from '@/app/actions/productOptions'
import { CrudActionButton, CrudFilterBar, CrudPrimaryButton, CrudTable } from '@/components/ui/ParabellumCrudTable'

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

export default function ModifiersManagement() {
  const { data: session, status } = useSession()
  const storeId = session?.user?.storeId

  const [options, setOptions] = useState<SupplementOption[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    price: '0',
    type: 'SUPPLEMENT' as 'SUPPLEMENT' | 'REMOVAL',
    categoryId: ''
  })

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const [catsData, optsData] = await Promise.all([
        getCategories(storeId),
        getProductOptions(storeId)
      ])
      setCategories(catsData as CategoryItem[])
      setOptions(optsData as SupplementOption[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      void loadData()
    }
  }, [storeId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId) return

    if (!formData.name.trim()) {
      setErrorModal("Le nom du modificateur est requis.")
      return
    }

    try {
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
        await loadData()
      } else {
        setErrorModal(res.error || "Erreur lors de la création")
      }
    } catch (err) {
      console.error(err)
      setErrorModal("Une erreur inattendue est survenue.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteProductOption(id)
    if (res.success) {
      await loadData()
    } else {
      setErrorModal(res.error || "Erreur lors de la suppression")
    }
  }

  const visibleOptions = options.filter((opt) => {
    const matchesSearch = opt.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = !filterType || opt.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Modificateurs</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez les modificateurs d'articles appliqués lors de la commande</p>
        </div>
        <CrudPrimaryButton
          onClick={() => {
            setFormData({ name: '', price: '0', type: 'SUPPLEMENT', categoryId: '' });
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter Modificateur
        </CrudPrimaryButton>
      </div>

      {/* Filter Bar */}
      <CrudFilterBar
        searchValue={search}
        searchPlaceholder="Rechercher par nom de modificateur"
        onSearchChange={setSearch}
        statusValue={filterType}
        statusOptions={[
          { value: 'SUPPLEMENT', label: 'Ajout de produit (+ prix)' },
          { value: 'REMOVAL', label: 'Retrait de produit (sans prix)' }
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
          title="Liste des modificateurs configurés"
          rows={visibleOptions}
          emptyLabel="Aucun modificateur trouvé"
          columns={[
            { key: 'serial', label: 'N°' },
            { key: 'type', label: 'Action' },
            { key: 'name', label: 'Nom du modificateur' },
            { key: 'price', label: 'Frais Additionnels' },
            { key: 'category', label: 'Catégorie Associée' },
            { key: 'actions', label: 'Actes', className: 'text-right' },
          ]}
          renderRow={(option, index) => {
            const associatedCategory = categories.find(c => c.id === option.categoryId)
            return (
              <tr key={option.id} className="transition hover:bg-[#fafbfc]">
                <td className="px-6 py-4 text-sm font-bold text-[#72788f]">{index + 1}</td>
                <td className="px-6 py-4">
                  {option.type === 'SUPPLEMENT' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#2fbe5f] border border-green-200">
                      <Sliders className="h-3 w-3" />
                      Ajout / Ingrédient +
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#f08c00] border border-amber-200">
                      <MinusCircle className="h-3 w-3" />
                      Retrait / Ingrédient -
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-[#495057]">{option.name}</td>
                <td className="px-6 py-4 text-sm font-black text-[#FF6D00]">
                  {option.type === 'SUPPLEMENT' ? `+ ${option.price.toLocaleString()} FCFA` : 'Gratuit'}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-[#72788f] uppercase tracking-wider">
                  {associatedCategory ? associatedCategory.name : 'Toutes les catégories'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <CrudActionButton label="Supprimer" tone="delete" onClick={() => setDeleteTarget(option.id)} />
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
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouveau Modificateur</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Configurez une option de modification</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Type de modification</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'SUPPLEMENT' })}
                    className={`flex-1 rounded-xl border py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.type === 'SUPPLEMENT'
                        ? 'bg-green-500 text-white border-transparent shadow-lg'
                        : 'bg-white text-[#868e96] border-[#dee2e6]'
                    }`}
                  >
                    + Ajout
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'REMOVAL', price: '0' })}
                    className={`flex-1 rounded-xl border py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.type === 'REMOVAL'
                        ? 'bg-amber-500 text-white border-transparent shadow-lg'
                        : 'bg-white text-[#868e96] border-[#dee2e6]'
                    }`}
                  >
                    − Retrait
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom du Modificateur</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                  placeholder="Ex: Fromage supplémentaire, Sans Piment..."
                />
              </div>

              {formData.type === 'SUPPLEMENT' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Tarif additionnel (FCFA)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="50"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                    placeholder="Ex: 300"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Associer à la catégorie</label>
                <div className="relative">
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full appearance-none bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25 cursor-pointer pr-10"
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
                className="w-full bg-[#171717] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]"
              >
                {isSubmitting ? "Enregistrement..." : "Créer le modificateur"}
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
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer ce modificateur ? Cette action est irréversible.</p>
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
