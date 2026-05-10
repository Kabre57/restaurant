'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Package, ToggleLeft, ToggleRight, Pencil, Check, X, Search, Plus, MoreVertical, Filter } from 'lucide-react'
import { toggleProductAvailability, updateProductPrice } from '@/app/actions/admin'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { AddProductModal } from './subcomponents/AddProductModal'

type Category = { id: string; name: string; icon: string | null }

type Product = {
  id: string
  name: string
  price: number
  isAvailable: boolean
  image: string | null
  category: Category
  categoryId: string
}

interface Props {
  products: Product[]
  categories: Category[]
}

export default function ProductsAdminClient({ products: initialProducts, categories }: Props) {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice]  = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const handleToggle = (productId: string, currentValue: boolean) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isAvailable: !currentValue } : p))
    startTransition(async () => {
      const res = await toggleProductAvailability(productId, !currentValue)
      if (!res.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, isAvailable: currentValue } : p))
        alert(res.error)
      }
    })
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setEditPrice(product.price.toString())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPrice("")
  }

  const saveEdit = (productId: string) => {
    const newPrice = parseFloat(editPrice)
    if (isNaN(newPrice) || newPrice <= 0) { alert("Prix invalide"); return }
    const oldPrice = products.find(p => p.id === productId)?.price ?? newPrice
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p))
    setEditingId(null)
    startTransition(async () => {
      const res = await updateProductPrice(productId, newPrice)
      if (!res.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: oldPrice } : p))
        alert(res.error)
      }
    })
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const available = products.filter(p => p.isAvailable).length
  const unavailable = products.length - available

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#212529] font-sans">
      <header className="h-16 bg-white border-b border-[#e9ecef] flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="p-2 hover:bg-[#f1f3f5] rounded-full transition-colors group">
            <ChevronLeft className="w-5 h-5 text-[#495057]" />
          </Link>
          <div className="h-8 w-px bg-[#dee2e6]" />
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-[#212529]" />
            <h1 className="text-lg font-black tracking-widest uppercase">Gestion du Catalogue</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <StatBadge label="DISPONIBLE" count={available} color="bg-[#2f9e44]" />
            <StatBadge label="RUPTURE" count={unavailable} color="bg-[#e03131]" />
          </div>
          <div className="h-8 w-px bg-[#dee2e6]" />
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#212529] hover:bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Ajouter un Produit
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {isAddModalOpen && session?.user?.storeId && (
          <AddProductModal 
            categories={categories} 
            storeId={session.user.storeId}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={(newProduct) => setProducts([newProduct, ...products])}
          />
        )}
        <div className="mb-6 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
            <input
              type="text"
              placeholder="RECHERCHER DANS LE CATALOGUE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#dee2e6] rounded-xl pl-11 pr-4 py-3 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button className="p-3 bg-white border border-[#dee2e6] rounded-xl hover:bg-[#f1f3f5] transition-all">
              <Filter className="w-4 h-4 text-[#495057]" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dee2e6] shadow-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-[#dee2e6]">
                <th className="text-[10px] font-black uppercase tracking-widest text-[#868e96] text-left p-6">Détails du Produit</th>
                <th className="text-[10px] font-black uppercase tracking-widest text-[#868e96] text-left p-6">Catégorie</th>
                <th className="text-[10px] font-black uppercase tracking-widest text-[#868e96] text-right p-6">Prix</th>
                <th className="text-[10px] font-black uppercase tracking-widest text-[#868e96] text-center p-6">État du Stock</th>
                <th className="text-[10px] font-black uppercase tracking-widest text-[#868e96] text-center p-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const isEditing = editingId === product.id
                return (
                  <tr key={product.id} className="border-b border-[#f1f3f5] hover:bg-[#fafbfc] transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#f8f9fa] border border-[#dee2e6] flex items-center justify-center text-2xl shrink-0 overflow-hidden relative">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} fill className="object-cover" />
                          ) : (
                            <span className="opacity-40">{getCategoryEmoji(product.category.name)}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-[#212529] uppercase tracking-tight leading-tight">{product.name}</span>
                          <span className="text-[10px] font-bold text-[#adb5bd] uppercase mt-0.5">ID: {product.id.slice(-8)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-6">
                      <span className="px-3 py-1 bg-[#f1f3f5] rounded-full text-[10px] font-black text-[#495057] uppercase tracking-widest border border-[#dee2e6]">
                        {product.category.name}
                      </span>
                    </td>

                    <td className="p-6 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(product.id); if (e.key === 'Escape') cancelEdit() }}
                            autoFocus
                            className="w-24 bg-white border-2 border-[#212529] rounded-lg px-3 py-1.5 text-right text-sm font-black focus:outline-none"
                          />
                          <button onClick={() => saveEdit(product.id)} className="p-2 bg-[#212529] text-white rounded-lg hover:bg-black transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-2 bg-[#f1f3f5] text-[#495057] rounded-lg hover:bg-[#dee2e6] transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(product)} className="flex items-center justify-end gap-2 ml-auto group/price">
                          <span className="text-lg font-black text-[#212529]">{product.price.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-[#adb5bd] uppercase">FCFA</span>
                          <Pencil className="w-3.5 h-3.5 text-[#adb5bd] opacity-0 group-hover/price:opacity-100 transition-opacity ml-1" />
                        </button>
                      )}
                    </td>

                    <td className="p-6 text-center">
                      <AdminStockBadge isAvailable={product.isAvailable} />
                    </td>

                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => handleToggle(product.id, product.isAvailable)}
                          disabled={isPending}
                          className="transition-all active:scale-95"
                        >
                          {product.isAvailable ? (
                            <ToggleRight className="w-8 h-8 text-[#2f9e44]" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-[#adb5bd]" />
                          )}
                        </button>
                        <button className="p-2 hover:bg-[#f1f3f5] rounded-lg transition-all"><MoreVertical className="w-4 h-4 text-[#adb5bd]" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-[#adb5bd] gap-4">
              <Package className="w-12 h-12 opacity-10" />
              <p className="text-sm font-black uppercase tracking-widest">Aucun produit trouvé</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatBadge({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] font-black text-[#adb5bd] tracking-widest mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-black">{count}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      </div>
    </div>
  )
}

function AdminStockBadge({ isAvailable }: { isAvailable: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isAvailable ? 'bg-[#ebfbee] border-[#b2f2bb] text-[#2f9e44]' : 'bg-[#fff5f5] border-[#ffc9c9] text-[#e03131]'}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-[#2f9e44]' : 'bg-[#e03131]'}`} />
      {isAvailable ? 'Disponible' : 'En Rupture'}
    </div>
  )
}

function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('burger')) return '🍔'
  if (n.includes('poulet')) return '🍗'
  if (n.includes('boisson')) return '🥤'
  if (n.includes('dessert')) return '🍰'
  if (n.includes('frite')) return '🍟'
  return '🍽️'
}
