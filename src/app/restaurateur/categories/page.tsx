'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Trash2, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/app/actions/products'
import { useSession } from 'next-auth/react'
import { optimizeImageFile } from '@/lib/client-image'
import { CrudActionButton, CrudFilterBar, CrudPrimaryButton, CrudStatus, CrudTable } from '@/components/ui/ParabellumCrudTable'

type CategoryItem = {
  id: string
  name: string
  imageUrl: string | null
}

export default function CategoriesManagement() {
  const { data: session, status } = useSession()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: ''
  })

  useEffect(() => {
    if (status === 'loading') return

    const storeId = session?.user?.storeId
    if (!storeId) {
      setLoading(false)
      return
    }

    let isCancelled = false

    async function fetchCategories() {
      try {
        setLoading(true)
        const data = await getCategories(storeId)
        if (isCancelled) return
        setCategories(data as CategoryItem[])
      } catch (err) {
        console.error("Failed to load categories:", err)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void fetchCategories()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId, status])

  async function loadCategories() {
    const storeId = session?.user?.storeId
    if (!storeId) return
    try {
      setLoading(true)
      const data = await getCategories(storeId)
      setCategories(data as CategoryItem[])
    } catch (err) {
      console.error("Failed to reload categories:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const storeId = session?.user?.storeId
    if (!storeId) {
      setErrorModal("Identifiant du restaurant introuvable. Veuillez vous reconnecter.")
      return
    }

    try {
      setIsSubmitting(true)
      
      const payload = {
        ...formData,
        storeId
      }

      let res
      if (editingCategory) {
        res = await updateCategory(editingCategory.id, payload)
      } else {
        res = await createCategory(payload)
      }

      if (res.success) {
        setShowModal(false)
        setEditingCategory(null)
        setFormData({ name: '', imageUrl: '' })
        loadCategories()
      } else {
        setErrorModal(res.error || "Erreur lors de l'enregistrement")
      }
    } catch (err) {
      console.error("Failed to submit category:", err)
      setErrorModal("Une erreur inattendue est survenue.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteCategory(id)
    if (res.success) loadCategories()
    else setErrorModal(res.error || "Erreur lors de la suppression")
  }

  function handleDeleteClick(id: string) {
    setDeleteTarget(id)
  }

  function handleEdit(category: CategoryItem) {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      imageUrl: category.imageUrl || ''
    })
    setShowModal(true)
  }

  async function handleImageSelection(file?: File | null) {
    if (!file) return

    try {
      const optimizedImage = await optimizeImageFile(file)
      setFormData((current) => ({ ...current, imageUrl: optimizedImage }))
    } catch (error) {
      setErrorModal(error instanceof Error ? error.message : "Impossible de traiter cette image.")
    }
  }

  const visibleCategories = categories.filter((category) => (
    category.name.toLowerCase().includes(search.toLowerCase())
  ))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Catégories</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Organisez votre menu par catégories</p>
        </div>
        <CrudPrimaryButton
          onClick={() => { setEditingCategory(null); setFormData({ name: '', imageUrl: '' }); setShowModal(true); }}
        >
          Ajouter Catégorie
        </CrudPrimaryButton>
      </div>

      <CrudFilterBar
        searchValue={search}
        searchPlaceholder="Nom de catégorie"
        onSearchChange={setSearch}
        onReset={() => setSearch('')}
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <CrudTable
          title="Liste des catégories"
          rows={visibleCategories}
          emptyLabel="Aucune catégorie trouvée"
          columns={[
            { key: 'serial', label: 'N° de série' },
            { key: 'title', label: 'Titre' },
            { key: 'image', label: 'Image' },
            { key: 'status', label: 'Statut' },
            { key: 'actions', label: 'Actes', className: 'text-right' },
          ]}
          footerLabel={`Page 1 sur 1, affichant ${visibleCategories.length} catégorie${visibleCategories.length > 1 ? 's' : ''} sur ${categories.length} au total.`}
          renderRow={(category, index) => (
            <tr key={category.id} className="transition hover:bg-[#fafbfc]">
              <td className="px-6 py-4 text-sm font-bold text-[#72788f]">{index + 1}</td>
              <td className="px-6 py-4 text-sm font-bold text-[#495057]">{category.name}</td>
              <td className="px-6 py-4 text-sm font-medium text-[#72788f]">
                {category.imageUrl ? (
                  <div className="w-12 h-12 rounded-xl bg-[#F4F6F8] border border-[#EFF3F8] overflow-hidden relative flex items-center justify-center">
                    <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#F4F6F8] border border-[#EFF3F8] flex items-center justify-center text-[#adb5bd] text-xs font-black">
                    AUCUNE
                  </div>
                )}
              </td>
              <td className="px-6 py-4"><CrudStatus tone={category.imageUrl ? 'success' : 'muted'}>{category.imageUrl ? 'Complète' : 'À compléter'}</CrudStatus></td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <CrudActionButton label="Modifier la catégorie" tone="edit" onClick={() => handleEdit(category)} />
                  <CrudActionButton label="Supprimer la catégorie" tone="delete" onClick={() => handleDeleteClick(category.id)} />
                </div>
              </td>
            </tr>
          )}
        />
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{editingCategory ? 'Modifier Catégorie' : 'Nouvelle Catégorie'}</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Définissez les détails de la catégorie</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom de la Catégorie</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="EX: BOISSONS" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Image (Optionnel)</label>
                <div 
                  onClick={() => document.getElementById('cat-image-upload')?.click()}
                  className={`relative h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.imageUrl ? 'border-[#2f9e44] bg-[#ebfbee]' : 'border-[#dee2e6] hover:border-[#212529] bg-[#f8f9fa]'}`}
                >
                  {formData.imageUrl ? (
                    <div className="relative w-full h-full p-2 flex items-center justify-center">
                      <Image src={formData.imageUrl} alt="Preview" fill unoptimized className="rounded-xl object-contain" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer l&apos;image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#adb5bd]">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">PNG, JPG, WEBP optimises auto</span>
                    </div>
                  )}
                  <input 
                    id="cat-image-upload"
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      await handleImageSelection(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {isSubmitting ? "Enregistrement..." : editingCategory ? "Mettre à jour" : "Créer la catégorie"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer cette catégorie ? Cette action est irréversible.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-[#e03131] hover:bg-[#c92a2a] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Erreur / Alerte */}
      {errorModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300 sm:p-8">
            <button onClick={() => setErrorModal(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Action Impossible</h2>
            <p className="text-sm font-bold text-[#495057] mb-8 leading-relaxed">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">J&apos;ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}
