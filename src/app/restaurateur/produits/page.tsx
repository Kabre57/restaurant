'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Edit3, Package, X, Loader2, AlertCircle, Search } from 'lucide-react'
import { getProductsByStore, createProduct, updateProduct, deleteProduct, getCategories } from '@/app/actions/products'
import { useSession } from 'next-auth/react'
import { optimizeImageFile } from '@/lib/client-image'

type ProductRow = Awaited<ReturnType<typeof getProductsByStore>>[number]
type CategoryRow = Awaited<ReturnType<typeof getCategories>>[number]

export default function RestaurateurProducts() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    categoryId: '',
    image: '',
    averagePrepTimeMins: '15',
    isAvailable: true,
    trackStock: false,
    stockQuantity: '0',
    minStockLevel: '5'
  })

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return

    let isCancelled = false
    const activeStoreId = storeId

    async function fetchData() {
      setLoading(true)
      const [pData, cData] = await Promise.all([
        getProductsByStore(activeStoreId),
        getCategories(activeStoreId)
      ])
      if (isCancelled) return
      setProducts(pData)
      setCategories(cData)
      setLoading(false)
    }

    void fetchData()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  async function loadData() {
    if (!session?.user?.storeId) return

    setLoading(true)
    const [pData, cData] = await Promise.all([
      getProductsByStore(session.user.storeId),
      getCategories(session.user.storeId)
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
      averagePrepTimeMins: parseInt(formData.averagePrepTimeMins),
      storeId: session?.user?.storeId as string,
      trackStock: formData.trackStock,
      stockQuantity: parseInt(formData.stockQuantity),
      minStockLevel: parseInt(formData.minStockLevel)
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
      setFormData({ 
        name: '', 
        price: '', 
        categoryId: '', 
        image: '', 
        averagePrepTimeMins: '15',
        isAvailable: true,
        trackStock: false,
        stockQuantity: '0',
        minStockLevel: '5'
      })
      loadData()
    } else {
      setErrorModal(res.error || "Erreur lors de l'enregistrement")
    }
    setIsSubmitting(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const res = await deleteProduct(id)
    if (res.success) loadData()
    else setErrorModal(res.error || "Erreur lors de la suppression")
  }

  function handleDeleteClick(id: string) {
    setDeleteTarget(id)
  }

  async function toggleAvailability(product: ProductRow) {
    const res = await updateProduct(product.id, { isAvailable: !product.isAvailable })
    if (res.success) loadData()
  }

  function handleEdit(product: ProductRow) {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      categoryId: product.categoryId,
      image: product.image || '',
      averagePrepTimeMins: (product.averagePrepTimeMins || 15).toString(),
      isAvailable: product.isAvailable,
      trackStock: product.trackStock || false,
      stockQuantity: (product.stockQuantity || 0).toString(),
      minStockLevel: (product.minStockLevel || 5).toString()
    })
    setShowModal(true)
  }

  function isDrinkCategory(categoryName?: string) {
    return categoryName?.toLowerCase().includes('boisson') || false
  }

  async function handleImageSelection(file?: File | null) {
    if (!file) return

    try {
      const optimizedImage = await optimizeImageFile(file)
      setFormData((current) => ({ ...current, image: optimizedImage }))
    } catch (error) {
      setErrorModal(error instanceof Error ? error.message : "Impossible de traiter cette image.")
    }
  }

  const visibleProducts = products.filter((product) => {
    const query = search.toLowerCase()
    const matchesSearch = product.name.toLowerCase().includes(query) || product.category?.name?.toLowerCase().includes(query)
    const matchesCategory = activeCategory === 'all' ? true : product.categoryId === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Menu</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez votre carte et la disponibilité en cuisine</p>
        </div>
        <button 
          onClick={() => { 
            setEditingProduct(null); 
            setFormData({ 
              name: '', 
              price: '', 
              categoryId: '', 
              image: '', 
              averagePrepTimeMins: '15',
              isAvailable: true,
              trackStock: false,
              stockQuantity: '0',
              minStockLevel: '5'
            }); 
            setShowModal(true); 
          }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#212529] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black sm:w-auto sm:px-8"
        >
          <Plus className="w-5 h-5" />
          Ajouter un plat
        </button>
      </div>

      <div className="rounded-xl border border-[#e5e7ef] bg-white p-4 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.06)]">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex min-w-[7rem] flex-col items-center justify-center gap-2 rounded-lg px-4 py-4 text-[10px] font-black uppercase tracking-tight transition ${activeCategory === 'all' ? 'bg-[#ff6b4a] text-white shadow-lg' : 'bg-[#f8f9fa] text-[#495057] hover:bg-[#eef1ff]'}`}
          >
            <span className="text-2xl">🍽️</span>
            Tous
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex min-w-[7rem] flex-col items-center justify-center gap-2 rounded-lg px-4 py-4 text-[10px] font-black uppercase tracking-tight transition ${activeCategory === category.id ? 'bg-[#ff6b4a] text-white shadow-lg' : 'bg-[#f8f9fa] text-[#495057] hover:bg-[#eef1ff]'}`}
            >
              <span className="text-2xl">🍴</span>
              {category.name}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un plat, une boisson ou une formule..."
            className="h-12 flex-1 rounded-full border border-[#e5e7ef] bg-white px-6 text-sm font-medium text-[#495057] outline-none transition focus:border-[var(--parabellum-primary)]"
          />
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--parabellum-primary)] px-8 text-sm font-black text-white transition hover:bg-[#253ec7]">
            Recherche
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleProducts.map((product) => (
            (() => {
              const isDrink = isDrinkCategory(product.category?.name)
              return (
            <div key={product.id} className={`bg-white rounded-[2rem] border border-[#dee2e6] overflow-hidden group hover:shadow-2xl transition-all ${!product.isAvailable ? 'opacity-60' : ''}`}>
              <div className="h-40 bg-gradient-to-b from-[#f8f9fa] to-[#eef1f4] relative overflow-hidden p-4">
                {product.image ? (
                  <div className="w-full h-full rounded-[1.5rem] bg-white/85 shadow-[0_18px_40px_rgba(33,37,41,0.08)] border border-white/70 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                    <Image src={product.image} alt={product.name} width={360} height={220} unoptimized className={`h-full w-full object-contain transition-transform duration-700 ${isDrink ? 'scale-[1.08] p-1 group-hover:scale-[1.12]' : 'p-3 group-hover:scale-105'}`} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                )}
                <div className="absolute top-4 right-4 flex gap-2 transition-all sm:opacity-0 sm:group-hover:opacity-100">
                  <button onClick={() => handleEdit(product)} className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-[#212529] transition-all">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteClick(product.id)} className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-[#e03131] transition-all">
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
                  <p className="text-[10px] font-black text-[#495057] uppercase tracking-widest mt-2">Prep ~ {product.averagePrepTimeMins || 15} min</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-[#212529]">{product.price.toLocaleString()} FCFA</span>
                  <div className="flex flex-col items-end gap-1">
                    <button 
                      onClick={() => toggleAvailability(product)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${product.isAvailable ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff5f5] text-[#e03131]'}`}
                    >
                      {product.isAvailable ? 'En Stock' : 'Épuisé'}
                    </button>
                    {product.trackStock && (
                      <span className={`text-[8px] font-bold uppercase ${product.stockQuantity <= product.minStockLevel ? 'text-[#e03131]' : 'text-[#adb5bd]'}`}>
                        Stock: {product.stockQuantity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
              )
            })()
          ))}
          {visibleProducts.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-[#e5e7ef] bg-white py-16 text-center text-xs font-black uppercase tracking-widest text-[#adb5bd]">
              Aucun produit ne correspond aux filtres
            </div>
          )}
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-8 lg:p-10">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:right-6 sm:top-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{editingProduct ? 'Modifier le plat' : 'Nouveau Produit'}</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Définissez les détails de votre offre culinaire</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Prep moyenne (min)</label>
                  <input required min={1} type="number" value={formData.averagePrepTimeMins} onChange={(e) => setFormData({...formData, averagePrepTimeMins: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="15" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Image du Produit</label>
                <div 
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className={`relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.image ? 'border-[#2f9e44] bg-[#ebfbee]' : 'border-[#dee2e6] hover:border-[#212529] bg-[#f8f9fa]'}`}
                >
                  {formData.image ? (
                    <div className="relative w-full h-full p-2 flex items-center justify-center">
                      <Image src={formData.image} alt="Preview" fill unoptimized className="rounded-xl object-contain" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer l&apos;image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#adb5bd]">
                      <Package className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">PNG, JPG, WEBP optimises auto</span>
                    </div>
                  )}
                  <input 
                    id="image-upload"
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

              <div className="space-y-4 rounded-[2rem] border border-[#dee2e6] bg-[#f8f9fa] p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, trackStock: !formData.trackStock})}
                      className={`w-10 h-5 rounded-full transition-all relative ${formData.trackStock ? 'bg-[#212529]' : 'bg-[#adb5bd]'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.trackStock ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className="text-[10px] font-black text-[#212529] uppercase tracking-widest">Suivre les stocks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})}
                      className={`w-10 h-5 rounded-full transition-all relative ${formData.isAvailable ? 'bg-[#51cf66]' : 'bg-[#adb5bd]'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.isAvailable ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className="text-[10px] font-black text-[#212529] uppercase tracking-widest">Disponible</span>
                  </div>
                </div>

                {formData.trackStock && (
                  <div className="grid grid-cols-1 gap-4 border-t border-[#dee2e6] pt-4 animate-in fade-in slide-in-from-top-2 duration-300 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Quantité en stock</label>
                      <input type="number" value={formData.stockQuantity} onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})} className="w-full bg-white border border-[#dee2e6] rounded-xl px-4 py-2 text-xs font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Seuil d&apos;alerte</label>
                      <input type="number" value={formData.minStockLevel} onChange={(e) => setFormData({...formData, minStockLevel: e.target.value})} className="w-full bg-white border border-[#dee2e6] rounded-xl px-4 py-2 text-xs font-bold" />
                    </div>
                  </div>
                )}
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {isSubmitting ? "Enregistrement..." : editingProduct ? "Mettre à jour" : "Créer le produit"}
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
            <p className="text-xs font-bold text-[#adb5bd] mb-8">Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.</p>
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
