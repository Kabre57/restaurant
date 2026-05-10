'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Search, Package, Layers, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { getProductsByStore, createProduct, updateProduct, deleteProduct, getCategories } from '@/app/actions/products'
import { useSession } from 'next-auth/react'

export default function RestaurateurProducts() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    categoryId: '',
    image: '',
    isAvailable: true
  })

  useEffect(() => {
    if (session?.user?.storeId) {
      loadData()
    }
  }, [session])

  async function loadData() {
    setLoading(true)
    const [pData, cData] = await Promise.all([
      getProductsByStore(session?.user?.storeId as string),
      getCategories()
    ])
    setProducts(pData)
    setCategories(cData)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      storeId: session?.user?.storeId as string
    }

    let res
    if (editingProduct) {
      res = await updateProduct(editingProduct.id, payload)
    } else {
      res = await createProduct(payload)
    }

    if (res.success) {
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ name: '', price: '', categoryId: '', image: '', isAvailable: true })
      loadData()
    } else {
      alert(res.error)
    }
    setIsSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
      const res = await deleteProduct(id)
      if (res.success) loadData()
    }
  }

  async function toggleAvailability(product: any) {
    const res = await updateProduct(product.id, { isAvailable: !product.isAvailable })
    if (res.success) loadData()
  }

  function handleEdit(product: any) {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      categoryId: product.categoryId,
      image: product.image || '',
      isAvailable: product.isAvailable
    })
    setShowModal(true)
  }

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Menu & Produits</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez votre carte et la disponibilité en cuisine</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(null); setFormData({ name: '', price: '', categoryId: '', image: '', isAvailable: true }); setShowModal(true); }}
          className="bg-[#212529] hover:bg-black text-white px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter un plat
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className={`bg-white rounded-[2rem] border border-[#dee2e6] overflow-hidden group hover:shadow-2xl transition-all ${!product.isAvailable ? 'opacity-60' : ''}`}>
              <div className="h-40 bg-[#f1f3f5] relative overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                )}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(product)} className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-[#212529] transition-all">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-[#e03131] transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-[#e03131] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Indisponible</span>
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-[#212529] uppercase tracking-tight line-clamp-1">{product.name}</h3>
                  <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">{product.category?.name || 'Sans Catégorie'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-[#212529]">{product.price.toLocaleString()} FCFA</span>
                  <button 
                    onClick={() => toggleAvailability(product)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${product.isAvailable ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff5f5] text-[#e03131]'}`}
                  >
                    {product.isAvailable ? 'En Stock' : 'Épuisé'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{editingProduct ? 'Modifier le plat' : 'Nouveau Produit'}</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Définissez les détails de votre offre culinaire</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom du plat</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="EX: BURGER DOUBLE FROMAGE" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Prix (FCFA)</label>
                  <input required type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Catégorie</label>
                  <select required value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529]">
                    <option value="">SÉLECTIONNER...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Image du Produit</label>
                <div 
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className={`relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.image ? 'border-[#2f9e44] bg-[#ebfbee]' : 'border-[#dee2e6] hover:border-[#212529] bg-[#f8f9fa]'}`}
                >
                  {formData.image ? (
                    <div className="relative w-full h-full p-2">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer l'image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#adb5bd]">
                      <Package className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cliquez pour uploader (PC)</span>
                    </div>
                  )}
                  <input 
                    id="image-upload"
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => setFormData({...formData, image: reader.result as string})
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#f8f9fa] p-4 rounded-xl border border-[#dee2e6]">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})}
                  className={`w-10 h-5 rounded-full transition-all relative ${formData.isAvailable ? 'bg-[#51cf66]' : 'bg-[#adb5bd]'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.isAvailable ? 'left-6' : 'left-1'}`} />
                </button>
                <span className="text-[10px] font-black text-[#212529] uppercase tracking-widest">Plat disponible immédiatement</span>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {isSubmitting ? "Enregistrement..." : editingProduct ? "Mettre à jour" : "Créer le produit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
