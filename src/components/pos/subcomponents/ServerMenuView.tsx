'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { Table } from '@prisma/client'
import type { CachedCategory, CachedProduct } from '@/lib/idb'
import { ChefHat, Clock3, GlassWater, LayoutList, MapPinned, Plus, Soup, UtensilsCrossed } from 'lucide-react'

type ServerMenuViewProps = {
  categories: CachedCategory[]
  filteredProducts: CachedProduct[]
  activeCategory: string | null
  selectedTable: Table | null
  onCategoryChange: (categoryId: string | null) => void
  onProductAdd: (product: CachedProduct) => void
}

type ProductGroup = {
  category: CachedCategory
  products: CachedProduct[]
}

function getCategoryAccent(name: string) {
  const normalizedName = name.toLowerCase()

  if (normalizedName.includes('boisson')) {
    return {
      pill: 'bg-[#e7f5ff] text-[#1971c2] border-[#a5d8ff]'
    }
  }

  if (normalizedName.includes('dessert')) {
    return {
      pill: 'bg-[#fff0f6] text-[#c2255c] border-[#faa2c1]'
    }
  }

  return {
    pill: 'bg-[#fff4e6] text-[#d9480f] border-[#ffc078]'
  }
}

function ServerMenuItemCard({
  product,
  categoryName,
  onAdd,
}: {
  product: CachedProduct
  categoryName: string
  onAdd: () => void
}) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null)
  const canDisplayImage = Boolean(product.image) && failedImageSrc !== product.image
  const prepMinutes = Math.max(1, product.averagePrepTimeMins || 15)
  const accent = getCategoryAccent(categoryName)
  const initials = product.name ? product.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PR'

  return (
    <article className="rounded-[2rem] border border-[#ebeef2] bg-white p-4 shadow-[0_20px_45px_rgba(33,37,41,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(33,37,41,0.08)]">
      <div className="flex gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(160deg,#f8f9fa_0%,#eceff3_100%)]">
          {canDisplayImage ? (
            <Image
              src={product.image || ''}
              alt={product.name}
              fill
              unoptimized
              sizes="96px"
              onError={() => setFailedImageSrc(product.image || null)}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#E9ECEF] flex items-center justify-center text-xs font-black text-[#868E96] select-none">
                {initials}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] ${accent.pill}`}>
                {categoryName}
              </div>
              <h3 className="mt-3 text-base font-black uppercase tracking-tight text-[#1f2328]">
                {product.name}
              </h3>
            </div>
            <div className="rounded-2xl bg-[#f8f9fa] px-3 py-2 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#adb5bd]">Prep</p>
              <p className="text-sm font-black text-[#212529]">~ {prepMinutes} min</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#adb5bd]">Prix</p>
              <p className="text-xl font-black tracking-tight text-[#212529]">
                {product.price.toLocaleString()} <span className="text-[11px]">FCFA</span>
              </p>
            </div>

            <button
              onClick={onAdd}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#212529] px-5 text-[10px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ServerMenuView({
  categories,
  filteredProducts,
  activeCategory,
  selectedTable,
  onCategoryChange,
  onProductAdd,
}: ServerMenuViewProps) {
  // On regroupe les articles par categorie pour presenter une vraie carte de salle,
  // plus proche d'un menu de restaurant qu'une grille de caisse.
  const groupedProducts = useMemo<ProductGroup[]>(() => {
    const productMap = new Map<string, CachedProduct[]>()

    for (const product of filteredProducts) {
      const existingGroup = productMap.get(product.categoryId) || []
      existingGroup.push(product)
      productMap.set(product.categoryId, existingGroup)
    }

    return categories
      .map((category) => ({
        category,
        products: productMap.get(category.id) || [],
      }))
      .filter((group) => group.products.length > 0)
  }, [categories, filteredProducts])

  const visibleProductCount = filteredProducts.length
  const tableNumber = selectedTable ? selectedTable.number : 'Non spécifiée'

  return (
    <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#eef1f4_0%,#f8f9fa_26%,#f3f5f7_100%)] p-8 custom-scrollbar">
      <section className="relative overflow-hidden rounded-[2.75rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,#fff4e6_0%,#ffffff_38%,#f8f9fa_100%)] px-8 py-8 shadow-[0_35px_80px_rgba(33,37,41,0.08)]">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#ffd8a8]/40 blur-3xl" />
        <div className="absolute bottom-0 left-12 h-24 w-24 rounded-full bg-[#ffe8cc]/60 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffd8a8] bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#d9480f]">
              <UtensilsCrossed className="h-4 w-4" />
              Carte Serveur
            </div>
            <h2 className="mt-5 text-3xl font-black uppercase tracking-tight text-[#212529] lg:text-4xl">
              {selectedTable ? `Service en salle pour la table ${tableNumber}` : 'Prendre Commande (Table non spécifiée)'}
            </h2>
            <p className="mt-3 max-w-xl text-sm font-bold leading-relaxed text-[#6c757d]">
              Le serveur choisit la table, puis parcourt la carte par familles de produits comme sur une fiche de menu.
              Les boissons, plats et desserts restent regroupes pour une prise de commande plus naturelle.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.75rem] border border-[#e9ecef] bg-white/85 px-5 py-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#adb5bd]">Table active</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-black text-[#212529]">
                <MapPinned className="h-4 w-4 text-[#f08c00]" />
                {tableNumber}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#e9ecef] bg-white/85 px-5 py-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#adb5bd]">Produits visibles</p>
              <p className="mt-2 text-lg font-black text-[#212529]">{visibleProductCount}</p>
            </div>
            <div className="rounded-[1.75rem] border border-[#e9ecef] bg-white/85 px-5 py-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#adb5bd]">Navigation</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-black text-[#212529]">
                <LayoutList className="h-4 w-4 text-[#12b886]" />
                Par categories
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 flex gap-3 overflow-x-auto pb-3 no-scrollbar">
        <button
          onClick={() => onCategoryChange(null)}
          className={`rounded-2xl border px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] transition-all whitespace-nowrap ${
            !activeCategory
              ? 'border-[#212529] bg-[#212529] text-white shadow-xl'
              : 'border-[#dee2e6] bg-white text-[#868e96] hover:border-[#212529] hover:text-[#212529]'
          }`}
        >
          Carte complete
        </button>

        {categories.map((category) => {
          const categoryCount = filteredProducts.filter((product) => product.categoryId === category.id).length

          if (activeCategory === null && categoryCount === 0) {
            return null
          }

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`rounded-2xl border px-6 py-4 text-left transition-all whitespace-nowrap ${
                activeCategory === category.id
                  ? 'border-[#212529] bg-[#212529] text-white shadow-xl'
                  : 'border-[#dee2e6] bg-white text-[#495057] hover:border-[#212529]'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.24em]">{category.name}</div>
              <div className={`mt-1 text-xs font-bold ${activeCategory === category.id ? 'text-white/80' : 'text-[#adb5bd]'}`}>
                {categoryCount} article{categoryCount > 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </section>

      {groupedProducts.length === 0 ? (
        <div className="mt-8 rounded-[2.5rem] border border-dashed border-[#ced4da] bg-white/70 px-10 py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[#f1f3f5]">
            <Clock3 className="h-8 w-8 text-[#adb5bd]" />
          </div>
          <h3 className="mt-6 text-2xl font-black uppercase tracking-tight text-[#212529]">Aucun produit trouve</h3>
          <p className="mt-3 text-sm font-bold text-[#868e96]">
            Essayez une autre recherche ou revenez a la carte complete pour afficher toutes les familles de menu.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groupedProducts.map((group) => {
            const accent = getCategoryAccent(group.category.name)

            return (
              <section
                key={group.category.id}
                className="rounded-[2.5rem] border border-white/80 bg-white/88 p-6 shadow-[0_28px_65px_rgba(33,37,41,0.06)] backdrop-blur"
              >
                <div className="mb-6 flex flex-col gap-4 border-b border-[#f1f3f5] pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[9px] font-black uppercase tracking-[0.24em] ${accent.pill}`}>
                      {group.category.name}
                    </div>
                    <h3 className="mt-4 text-2xl font-black uppercase tracking-tight text-[#212529]">
                      {group.category.name}
                    </h3>
                    <p className="mt-2 text-sm font-bold text-[#868e96]">
                      {group.products.length} suggestion{group.products.length > 1 ? 's' : ''} disponible{group.products.length > 1 ? 's' : ''} pour la salle.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f8f9fa] px-4 py-3 text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#adb5bd]">Commande serveur</p>
                    <p className="mt-1 text-sm font-black text-[#212529]">Ajout direct au panier de table</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {group.products.map((product) => (
                    <ServerMenuItemCard
                      key={product.id}
                      product={product}
                      categoryName={group.category.name}
                      onAdd={() => onProductAdd(product)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
