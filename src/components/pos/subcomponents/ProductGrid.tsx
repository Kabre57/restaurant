'use client'

import React, { useEffect, useState } from 'react'
import type { CachedCategory, CachedProduct } from '@/lib/idb'
import { ProductCard } from './ProductCard'
import { useSession } from 'next-auth/react'
import { Star } from 'lucide-react'

// Hook personnalisé pour la gestion des favoris (max 30)
function useFavoris(userId: string) {
  const [favoris, setFavoris] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    const saved = localStorage.getItem(`favoris_${userId}`)
    if (saved) {
      try {
        setFavoris(new Set(JSON.parse(saved)))
      } catch (e) {
        console.error(e)
      }
    }
  }, [userId])

  const toggleFavori = (productId: string) => {
    setFavoris((prev) => {
      const newFavoris = new Set(prev)
      if (newFavoris.has(productId)) {
        newFavoris.delete(productId)
      } else {
        if (newFavoris.size >= 30) {
          alert('Limite de 30 favoris atteinte (Loyverse standard).')
          return prev
        }
        newFavoris.add(productId)
      }
      localStorage.setItem(`favoris_${userId}`, JSON.stringify(Array.from(newFavoris)))
      return newFavoris
    })
  }

  return { favoris, toggleFavori }
}

interface ProductGridProps {
  categories: CachedCategory[]
  filteredProducts: CachedProduct[]
  activeCategory: string | null
  onCategoryChange: (categoryId: string | null) => void
  onProductAdd: (product: CachedProduct) => void
}

export function ProductGrid({
  categories,
  filteredProducts,
  activeCategory,
  onCategoryChange,
  onProductAdd,
}: ProductGridProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id || 'default_cashier'
  const { favoris, toggleFavori } = useFavoris(userId)
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--ui-bg)]">
      {/* Catégories - Hautement Tactiles (>44px de hauteur) */}
      <div className="flex gap-3 px-6 py-4 overflow-x-auto no-scrollbar shrink-0 select-none touch-manipulation">
        <button
          onClick={() => onCategoryChange(null)}
          className={`h-11 px-6 rounded-xl font-bold text-sm transition-all duration-150 whitespace-nowrap active:scale-95 border flex items-center gap-2 ${
            !activeCategory
              ? 'bg-[var(--ui-primary)] text-white border-transparent shadow-md'
              : 'bg-[var(--ui-surface)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] border-[var(--ui-border)]'
          }`}
          aria-pressed={!activeCategory}
        >
          Tous les produits
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`h-11 px-6 rounded-xl font-bold text-sm transition-all duration-150 whitespace-nowrap active:scale-95 border flex items-center gap-2 ${
              activeCategory === category.id
                ? 'bg-[var(--ui-primary)] text-white border-transparent shadow-md'
                : 'bg-[var(--ui-surface)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] border-[var(--ui-border)]'
            }`}
            aria-pressed={activeCategory === category.id}
          >
            {category.imageUrl && (
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-6 h-6 rounded-md object-cover select-none pointer-events-none"
              />
            )}
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Grille des produits tactiles */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar touch-manipulation space-y-8">
        
        {/* Section des Favoris (max 30, Loyverse-style) */}
        {favoris.size > 0 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-4 border-b border-amber-100 pb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Star className="w-3.5 h-3.5 fill-white" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                Produits Favoris ⭐ ({favoris.size})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts
                .filter((p) => favoris.has(p.id))
                .map((product) => (
                  <ProductCard
                    key={`fav-${product.id}`}
                    product={product}
                    categoryName={categories.find((c) => c.id === product.categoryId)?.name || 'Général'}
                    isFavori={true}
                    onToggleFavori={() => toggleFavori(product.id)}
                    onAdd={() => onProductAdd(product)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Tous les produits / Produits de la catégorie */}
        <div>
          {favoris.size > 0 && (
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--ui-text-muted)] mb-4 border-b border-gray-100 pb-2">
              {activeCategory ? 'Produits de la catégorie' : 'Tous les produits'}
            </h3>
          )}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--ui-text-muted)]">
              <p className="text-base font-bold">Aucun produit disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={categories.find((c) => c.id === product.categoryId)?.name || 'Général'}
                  isFavori={favoris.has(product.id)}
                  onToggleFavori={() => toggleFavori(product.id)}
                  onAdd={() => onProductAdd(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
