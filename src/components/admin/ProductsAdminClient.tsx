'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Package, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react'
import { toggleProductAvailability, updateProductPrice } from '@/app/actions/admin'

type Category = { id: string; name: string; icon: string | null }

type Product = {
  id: string
  name: string
  price: number
  isAvailable: boolean
  image: string | null
  category: Category
}

interface Props {
  products: Product[]
}

// ─── Composant Principal ──────────────────────────────────────────────────────
export default function ProductsAdminClient({ products: initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice]  = useState<string>("")
  const [isPending, startTransition] = useTransition()

  // ── Bascule disponibilité ──
  const handleToggle = (productId: string, currentValue: boolean) => {
    // Mise à jour optimiste
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isAvailable: !currentValue } : p))
    startTransition(async () => {
      const res = await toggleProductAvailability(productId, !currentValue)
      if (!res.success) {
        // Rollback si erreur
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, isAvailable: currentValue } : p))
        alert(res.error)
      }
    })
  }

  // ── Édition de prix ──
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
    // Mise à jour optimiste
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

  // ── Stats rapides ──
  const available   = products.filter(p => p.isAvailable).length
  const unavailable = products.length - available

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-100 font-sans">
      {/* Header */}
      <header className="h-20 bg-[#14161b] border-b border-[#2a2e37] flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Retour à la Caisse</span>
          </Link>
          <div className="h-6 w-px bg-[#2a2e37]" />
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-bold text-white">Gestion des Produits</h1>
          </div>
        </div>
        {/* Statistiques rapides */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {available} disponible{available !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            {unavailable} en rupture
          </div>
        </div>
      </header>

      {/* Tableau */}
      <main className="p-8">
        <div className="bg-[#14161b] rounded-2xl border border-[#2a2e37] overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2e37] text-xs font-semibold uppercase tracking-widest text-gray-500">
                <th className="text-left p-5">Produit</th>
                <th className="text-left p-5">Catégorie</th>
                <th className="text-right p-5">Prix (FCFA)</th>
                <th className="text-center p-5">Stock</th>
                <th className="text-center p-5">Disponible</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => {
                const isEditing = editingId === product.id
                return (
                  <tr
                    key={product.id}
                    className={`border-b border-[#2a2e37] transition-colors hover:bg-[#1e2128] ${
                      !product.isAvailable ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Nom */}
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2a2e37] flex items-center justify-center text-xl flex-shrink-0">
                          {getCategoryEmoji(product.category.name)}
                        </div>
                        <span className={`font-semibold ${product.isAvailable ? 'text-white' : 'text-gray-500 line-through'}`}>
                          {product.name}
                        </span>
                      </div>
                    </td>

                    {/* Catégorie */}
                    <td className="p-5">
                      <span className="text-sm text-gray-400 bg-[#2a2e37] px-3 py-1 rounded-full">
                        {product.category.icon && `${product.category.icon} `}{product.category.name}
                      </span>
                    </td>

                    {/* Prix — Éditable */}
                    <td className="p-5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(product.id); if (e.key === 'Escape') cancelEdit() }}
                            autoFocus
                            className="w-28 bg-[#0a0c10] border border-emerald-500 rounded-lg px-3 py-1.5 text-right text-emerald-400 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button onClick={() => saveEdit(product.id)} className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(product)}
                          className="group flex items-center justify-end gap-2 ml-auto hover:text-emerald-400 transition-colors"
                        >
                          <span className="font-bold text-emerald-400 text-lg">{product.price.toLocaleString()}</span>
                          <Pencil className="w-3.5 h-3.5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                        </button>
                      )}
                    </td>

                    {/* Indicateur de stock */}
                    <td className="p-5 text-center">
                      <StockBadge isAvailable={product.isAvailable} />
                    </td>

                    {/* Toggle disponibilité */}
                    <td className="p-5 text-center">
                      <button
                        onClick={() => handleToggle(product.id, product.isAvailable)}
                        disabled={isPending}
                        title={product.isAvailable ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                        className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                      >
                        {product.isAvailable ? (
                          <ToggleRight className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-600" />
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="py-16 flex items-center justify-center text-gray-500 italic">
              Aucun produit trouvé dans la base de données.
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-600 text-center">
          💡 Cliquez sur le prix pour le modifier. Cliquez sur le toggle pour désactiver un produit en rupture de stock.
        </p>
      </main>
    </div>
  )
}

// ─── Badge Stock ──────────────────────────────────────────────────────────────
function StockBadge({ isAvailable }: { isAvailable: boolean }) {
  if (isAvailable) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
        Disponible
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 text-xs font-semibold px-3 py-1 rounded-full border border-red-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Rupture
    </span>
  )
}

// ─── Emoji par catégorie ──────────────────────────────────────────────────────
function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('burger') || n.includes('sandwich')) return '🍔'
  if (n.includes('poulet') || n.includes('chicken'))  return '🍗'
  if (n.includes('pizza'))   return '🍕'
  if (n.includes('boisson')) return '🥤'
  if (n.includes('dessert')) return '🍰'
  if (n.includes('salade'))  return '🥗'
  if (n.includes('frite'))   return '🍟'
  return '🍽️'
}
