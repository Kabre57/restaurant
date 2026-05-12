'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Layers, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/app/actions/products'
import { useSession } from 'next-auth/react'

export default function CategoriesManagement() {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: ''
  })

  useEffect(() => {
    if (session?.user?.storeId) {
      loadCategories()
    }
  }, [session])

  async function loadCategories() {
    setLoading(true)
    // getCategories in products.ts currently fetches for the store. Let's make sure.
    const data = await getCategories()
    setCategories(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload = {
      ...formData,
      storeId: session?.user?.storeId as string
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
    setIsSubmitting(false)
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

  function handleEdit(category: any) {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      imageUrl: category.imageUrl || ''
    })
    setShowModal(true)
  }

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Catégories</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Organisez votre menu par catégories</p>
        </div>
        <button 
          onClick={() => { setEditingCategory(null); setFormData({ name: '', imageUrl: '' }); setShowModal(true); }}
          className="bg-[#212529] hover:bg-black text-white px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter Catégorie
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-[2rem] border border-[#dee2e6] overflow-hidden group hover:shadow-2xl transition-all">
              <div className="h-32 bg-[#f8f9fa] relative overflow-hidden flex items-center justify-center">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <Layers className="w-10 h-10 text-[#dee2e6]" />
                )}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(category)} className="p-2 bg-white/50 backdrop-blur-md text-[#212529] rounded-xl hover:bg-white transition-all shadow-sm">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteClick(category.id)} className="p-2 bg-white/50 backdrop-blur-md text-[#e03131] rounded-xl hover:bg-white transition-all shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-black text-[#212529] uppercase tracking-tight text-center">{category.name}</h3>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-[#adb5bd] gap-4">
              <Layers className="w-16 h-16 opacity-20" />
              <p className="font-bold text-sm uppercase tracking-widest">Aucune catégorie trouvée</p>
            </div>
          )}
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
            
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
                    <div className="relative w-full h-full p-2">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer l'image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#adb5bd]">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cliquez pour uploader</span>
                    </div>
                  )}
                  <input 
                    id="cat-image-upload"
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => setFormData({...formData, imageUrl: reader.result as string})
                        reader.readAsDataURL(file)
                      }
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
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Confirmer la suppression</h2>
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer cette catégorie ? Cette action est irréversible.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-[#e03131] hover:bg-[#c92a2a] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Erreur / Alerte */}
      {errorModal && (
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center relative">
            <button onClick={() => setErrorModal(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-5 h-5" /></button>
            <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#e03131]" />
            </div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-4">Action Impossible</h2>
            <p className="text-sm font-bold text-[#495057] mb-8 leading-relaxed">{errorModal}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">J'ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}
