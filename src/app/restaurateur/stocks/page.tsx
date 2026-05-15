'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Search, Package, AlertCircle, Save, Loader2, TrendingDown, TrendingUp, RefreshCcw } from 'lucide-react'
import { getProductsByStore, updateProduct } from '@/app/actions/products'
import { useSession } from 'next-auth/react'

type StockProduct = {
  id: string
  name: string
  image: string | null
  trackStock: boolean
  stockQuantity: number
  minStockLevel: number
  category?: { name: string } | null
}

export default function RestaurateurStocks() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<StockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({})

  async function loadProducts() {
    setLoading(true)
    const data = await getProductsByStore(session?.user?.storeId as string)
    setProducts(data as StockProduct[])
    
    const initialEdits: Record<string, string> = {}
    ;(data as StockProduct[]).forEach((p) => {
      initialEdits[p.id] = p.stockQuantity?.toString() || '0'
    })
    setStockEdits(initialEdits)
    setLoading(false)
  }

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return
    const activeStoreId = storeId

    let isCancelled = false

    async function fetchProducts() {
      setLoading(true)
      const data = await getProductsByStore(activeStoreId)
      if (isCancelled) return

      const typedData = data as StockProduct[]
      setProducts(typedData)

      const initialEdits: Record<string, string> = {}
      typedData.forEach((product) => {
        initialEdits[product.id] = product.stockQuantity?.toString() || '0'
      })

      setStockEdits(initialEdits)
      setLoading(false)
    }

    void fetchProducts()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  async function handleUpdateStock(productId: string) {
    setUpdatingId(productId)
    const newValue = parseInt(stockEdits[productId])
    if (isNaN(newValue)) {
      setUpdatingId(null)
      return
    }

    const res = await updateProduct(productId, { stockQuantity: newValue })
    if (res.success) {
      setProducts(products.map(p => p.id === productId ? { ...p, stockQuantity: newValue } : p))
    }
    setUpdatingId(null)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockCount = products.filter(p => p.trackStock && p.stockQuantity <= p.minStockLevel).length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Gestion des Stocks</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Surveillez et ajustez vos niveaux de stock en temps réel</p>
        </div>
        <button 
          onClick={loadProducts}
          className="rounded-2xl border border-[#dee2e6] bg-white p-3 text-[#adb5bd] transition-all hover:bg-[#f8f9fa] hover:text-[#212529] self-start"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex items-center gap-5 rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
          <div className="w-14 h-14 bg-[#f1f3f5] rounded-3xl flex items-center justify-center">
            <Package className="w-7 h-7 text-[#212529]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block">Total Produits</span>
            <span className="text-3xl font-black text-[#212529]">{products.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-5 rounded-[2rem] border border-[#ffc9c9] bg-[#fff5f5] p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
          <div className="w-14 h-14 bg-[#ff6b6b] rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <TrendingDown className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest block">Stocks Critiques</span>
            <span className="text-3xl font-black text-[#e03131]">{lowStockCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-5 rounded-[2rem] border border-[#b2f2bb] bg-[#ebfbee] p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
          <div className="w-14 h-14 bg-[#51cf66] rounded-3xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#2f9e44] uppercase tracking-widest block">Suivi Actif</span>
            <span className="text-3xl font-black text-[#2f9e44]">{products.filter(p => p.trackStock).length}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#dee2e6] bg-white shadow-sm sm:rounded-[2.5rem]">
        <div className="border-b border-[#f1f3f5] p-4 sm:p-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
            <input 
              type="text" 
              placeholder="RECHERCHER UN PRODUIT OU UNE CATÉGORIE..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
            />
          </div>
        </div>

        <div className="space-y-4 p-4 md:hidden">
          {filteredProducts.map((product) => {
            const isLow = product.trackStock && product.stockQuantity <= product.minStockLevel
            const isEditing = stockEdits[product.id] !== product.stockQuantity?.toString()

            return (
              <div key={product.id} className="rounded-[1.75rem] border border-[#dee2e6] bg-[#f8f9fa] p-4">
                <div className="flex items-start gap-4">
                  {product.image ? (
                    <Image src={product.image} alt={product.name} width={48} height={48} unoptimized className="h-12 w-12 rounded-xl border border-[#dee2e6] object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg">🍽️</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase text-[#212529]">{product.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">{product.category?.name}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${product.trackStock ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#f1f3f5] text-[#adb5bd]'}`}>
                        {product.trackStock ? 'Suivi actif' : 'Sans suivi'}
                      </span>
                      {product.trackStock && (
                        <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${isLow ? 'bg-[#fff5f5] text-[#e03131]' : 'bg-white text-[#495057]'}`}>
                          Seuil {product.minStockLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <input 
                    type="number" 
                    value={stockEdits[product.id]}
                    onChange={(e) => setStockEdits({ ...stockEdits, [product.id]: e.target.value })}
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-3 text-center text-sm font-black focus:outline-none focus:ring-2 focus:ring-[#212529] ${isLow ? 'border-[#ff6b6b] bg-[#fff5f5] text-[#e03131]' : 'border-[#dee2e6] bg-white text-[#212529]'}`}
                  />
                  {isLow && <AlertCircle className="w-4 h-4 text-[#e03131]" />}
                  <button 
                    disabled={!isEditing || updatingId === product.id}
                    onClick={() => handleUpdateStock(product.id)}
                    className={`rounded-xl p-3 transition-all ${isEditing ? 'bg-[#212529] text-white shadow-lg hover:bg-black' : 'bg-white text-[#adb5bd]'}`}
                  >
                    {updatingId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] text-left border-collapse">
          <thead>
            <tr className="bg-[#fafbfc] border-b border-[#f1f3f5]">
              <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Produit</th>
              <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-center">Suivi</th>
              <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-center">Seuil Alerte</th>
              <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest w-48">Stock Actuel</th>
              <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f3f5]">
            {filteredProducts.map((product) => {
              const isLow = product.trackStock && product.stockQuantity <= product.minStockLevel
              const isEditing = stockEdits[product.id] !== product.stockQuantity?.toString()

              return (
                <tr key={product.id} className="hover:bg-[#fafbfc] transition-all">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} width={40} height={40} unoptimized className="h-10 w-10 rounded-xl border border-[#dee2e6] object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#f1f3f5] flex items-center justify-center text-lg">🍽️</div>
                      )}
                      <div>
                        <span className="text-sm font-black text-[#212529] uppercase block">{product.name}</span>
                        <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">{product.category?.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${product.trackStock ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#f1f3f5] text-[#adb5bd]'}`}>
                      {product.trackStock ? 'OUI' : 'NON'}
                    </span>
                  </td>
                  <td className="p-6 text-center text-xs font-bold text-[#495057]">
                    {product.trackStock ? product.minStockLevel : '-'}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={stockEdits[product.id]}
                        onChange={(e) => setStockEdits({ ...stockEdits, [product.id]: e.target.value })}
                        className={`w-24 bg-[#f8f9fa] border rounded-xl px-3 py-2 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-[#212529] ${isLow ? 'border-[#ff6b6b] text-[#e03131] bg-[#fff5f5]' : 'border-[#dee2e6] text-[#212529]'}`}
                      />
                      {isLow && <AlertCircle className="w-4 h-4 text-[#e03131]" />}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      disabled={!isEditing || updatingId === product.id}
                      onClick={() => handleUpdateStock(product.id)}
                      className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-[#212529] text-white shadow-lg hover:bg-black' : 'text-[#adb5bd] bg-[#f8f9fa]'}`}
                    >
                      {updatingId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        
        {loading && (
          <div className="flex justify-center py-20 bg-white/50 backdrop-blur-sm"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
        )}
      </div>
    </div>
  )
}
