'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Plus, Star } from 'lucide-react'

export type ProductCardItem = {
  id: string
  name: string
  price: number
  image?: string | null
  averagePrepTimeMins?: number | null
  stockQuantity?: number | null
  trackStock?: boolean | null
}

interface ProductCardProps {
  product: ProductCardItem
  onAdd: () => void
  categoryName: string
  isFavori?: boolean
  onToggleFavori?: () => void
}

export function ProductCard({
  product,
  onAdd,
  categoryName,
  isFavori = false,
  onToggleFavori,
}: ProductCardProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null)

  const canDisplayImage = Boolean(product.image) && failedImageSrc !== product.image
  const initials = product.name ? product.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PR'

  return (
    <div 
      onClick={onAdd} 
      className="bg-white rounded-[24px] overflow-hidden border border-[#EFF3F8] hover:border-[#FF6D00] transition-all duration-300 cursor-pointer group flex flex-col p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transform active:scale-[0.98]"
    >
      {/* Zone visuelle de l'image (en haut, cadre gris arrondi avec respiration) */}
      <div className="w-full aspect-[4/3] bg-[#F4F6F8] rounded-[20px] relative overflow-hidden flex items-center justify-center p-4 shrink-0 select-none">
        {canDisplayImage ? (
          <div className="w-full h-full relative overflow-hidden">
            <Image
              src={product.image || ''}
              alt={product.name}
              fill
              unoptimized
              sizes="200px"
              onError={() => setFailedImageSrc(product.image || null)}
              className="w-full h-full object-contain p-1 transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#E9ECEF] flex items-center justify-center text-xs font-black text-[#868E96] select-none">
              {initials}
            </div>
          </div>
        )}

        {/* Badge Catégorie en haut à gauche */}
        <div className="absolute top-3 left-3 bg-[#e9ecef]/85 backdrop-blur-sm text-[#495057] px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border border-[#dee2e6]/50">
          {categoryName}
        </div>

        {/* Badge de stock orange vif en haut à droite */}
        <div className="absolute top-3 right-3 bg-[#FF5500] text-white px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider shadow-sm">
          STOCK: {product.stockQuantity ?? 0}
        </div>

        {/* Bouton Étoile Favori */}
        {onToggleFavori && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavori()
            }}
            className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 hover:scale-110 active:scale-95 transition-all shadow-md text-amber-400"
            aria-label="Ajouter aux favoris"
          >
            <Star className={`w-4 h-4 ${isFavori ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      {/* Détails du produit en dessous (sur fond blanc, sans chevauchement) */}
      <div className="flex flex-col pt-4 flex-1 justify-between">
        <div>
          <h3 className="font-extrabold text-xs text-[#212529] uppercase tracking-wide leading-tight line-clamp-2">
            {product.name}
          </h3>
        </div>

        <div className="flex justify-between items-center mt-4 pt-2 border-t border-dashed border-[#EFF3F8]">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest leading-none mb-1">
              Prix
            </span>
            <span className="font-black text-sm text-[#212529] tracking-tight">
              {product.price.toLocaleString()} <span className="text-[10px] text-[#FF6D00] font-black">FCFA</span>
            </span>
          </div>

          {/* Bouton Plus tactile orange */}
          <button 
            type="button"
            className="w-10 h-10 rounded-full bg-[#FF6D00] text-white flex items-center justify-center shadow-md hover:bg-[#E65C00] transition-all duration-200 transform active:scale-90 group-hover:scale-105 shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>
      </div>
    </div>
  )
}
