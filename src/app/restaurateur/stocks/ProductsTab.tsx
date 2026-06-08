'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Search, AlertCircle, Save, Loader2 } from 'lucide-react'
import { updateProduct } from '@/app/actions/catalog/products'

type StockProduct = {
  id: string
  name: string
  image: string | null
  trackStock: boolean
  stockQuantity: number
  minStockLevel: number
  category?: { name: string } | null
}

type ProductsTabProps = {
  products: StockProduct[]
  onRefresh: () => void
}

export function ProductsTab({ products, onRefresh }: ProductsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [productEdits, setProductEdits] = useState<Record<string, string>>(
    Object.fromEntries(products.map(p => [p.id, p.stockQuantity?.toString() || '0']))
  )

  async function handleUpdateProductStock(productId: string) {
    setUpdatingId(productId)
    const newValue = parseInt(productEdits[productId])
    if (isNaN(newValue)) {
      setUpdatingId(null)
      return
    }

    const res = await updateProduct(productId, { stockQuantity: newValue })
    if (res.success) {
      onRefresh()
    }
    setUpdatingId(null)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#dee2e6] bg-white shadow-sm sm:rounded-[2.5rem]">
      <div className="border-b border-[#f1f3f5] p-4 sm:p-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
          <input 
            type="text" 
            placeholder="RECHERCHER UN PRODUIT OU UNE CATÉGORIE..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] uppercase"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
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
              const isEditing = productEdits[product.id] !== product.stockQuantity?.toString()

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
                        value={productEdits[product.id] || ""}
                        onChange={(e) => setProductEdits({ ...productEdits, [product.id]: e.target.value })}
                        className={`w-24 bg-[#f8f9fa] border rounded-xl px-3 py-2 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-[#212529] ${isLow ? 'border-[#ff6b6b] text-[#e03131] bg-[#fff5f5]' : 'border-[#dee2e6] text-[#212529]'}`}
                      />
                      {isLow && <AlertCircle className="w-4 h-4 text-[#e03131]" />}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      disabled={!isEditing || updatingId === product.id}
                      onClick={() => handleUpdateProductStock(product.id)}
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
    </div>
  )
}
