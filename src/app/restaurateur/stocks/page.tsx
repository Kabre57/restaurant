'use client'

import React, { useState, useEffect } from 'react'
import { Search, Package, AlertCircle, Save, Loader2, TrendingDown, TrendingUp, RefreshCcw } from 'lucide-react'
import { getProductsByStore, updateProduct } from '@/app/actions/products'
import { useSession } from 'next-auth/react'

export default function RestaurateurStocks() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({})

  useEffect(() => {
    if (session?.user?.storeId) {
      loadProducts()
    }
  }, [session])

  async function loadProducts() {
    setLoading(true)
    const data = await getProductsByStore(session?.user?.storeId as string)
    setProducts(data)
    
    const initialEdits: Record<string, string> = {}
    data.forEach(p => {
      initialEdits[p.id] = p.stockQuantity?.toString() || '0'
    })
    setStockEdits(initialEdits)
    setLoading(false)
  }

  async function handleUpdateStock(productId: string) {
    setUpdatingId(productId)
    const newValue = parseInt(stockEdits[productId])
    if (isNaN(newValue)) return

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
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Gestion des Stocks</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Surveillez et ajustez vos niveaux de stock en temps réel</p>
        </div>
        <button 
          onClick={loadProducts}
          className="p-3 bg-white border border-[#dee2e6] rounded-2xl text-[#adb5bd] hover:text-[#212529] hover:bg-[#f8f9fa] transition-all"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-[#dee2e6] shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-[#f1f3f5] rounded-3xl flex items-center justify-center">
            <Package className="w-7 h-7 text-[#212529]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block">Total Produits</span>
            <span className="text-3xl font-black text-[#212529]">{products.length}</span>
          </div>
        </div>
        <div className="bg-[#fff5f5] p-8 rounded-[2.5rem] border border-[#ffc9c9] shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-[#ff6b6b] rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <TrendingDown className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest block">Stocks Critiques</span>
            <span className="text-3xl font-black text-[#e03131]">{lowStockCount}</span>
          </div>
        </div>
        <div className="bg-[#ebfbee] p-8 rounded-[2.5rem] border border-[#b2f2bb] shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-[#51cf66] rounded-3xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#2f9e44] uppercase tracking-widest block">Suivi Actif</span>
            <span className="text-3xl font-black text-[#2f9e44]">{products.filter(p => p.trackStock).length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-[#dee2e6] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#f1f3f5] flex items-center gap-4">
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

        <table className="w-full text-left border-collapse">
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
                        <img src={product.image} className="w-10 h-10 rounded-xl object-cover border border-[#dee2e6]" />
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
        
        {loading && (
          <div className="flex justify-center py-20 bg-white/50 backdrop-blur-sm"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
        )}
      </div>
    </div>
  )
}
