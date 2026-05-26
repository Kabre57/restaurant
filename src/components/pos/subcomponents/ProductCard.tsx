'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'

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
}

export function ProductCard({ product, onAdd, categoryName }: ProductCardProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null)

  const getCategoryEmoji = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('burger')) return '🍔'
    if (n.includes('poulet')) return '🍗'
    if (n.includes('frite')) return '🍟'
    if (n.includes('boisson')) return '🥤'
    if (n.includes('dessert')) return '🍰'
    return '🍽️'
  }

  const emoji = getCategoryEmoji(categoryName)
  const isDrink = categoryName.toLowerCase().includes('boisson')
  const canDisplayImage = Boolean(product.image) && failedImageSrc !== product.image
  const prepMinutes = Math.max(1, product.averagePrepTimeMins || 15)

  return (
    <div onClick={onAdd} className="bg-pos-surface rounded-3xl overflow-hidden border border-pos-border hover:border-brand-500 transition-all duration-300 cursor-pointer group flex flex-col shadow-soft hover:shadow-xl hover:-translate-y-1.5">
      <div className="aspect-[4/3] bg-gradient-to-b from-pos-bg to-pos-border/30 relative overflow-hidden p-4">
        {canDisplayImage ? (
          <div className="relative w-full h-full rounded-[1.5rem] bg-white/90 border border-white/80 shadow-[0_18px_40px_rgba(33,37,41,0.08)] flex items-center justify-center overflow-hidden">
            <Image
              src={product.image || ''}
              alt={product.name}
              fill
              unoptimized
              sizes="250px"
              onError={() => setFailedImageSrc(product.image || null)}
              className={`w-full h-full object-contain transition-transform duration-700 ${isDrink ? 'p-1 scale-[1.08] group-hover:scale-[1.12]' : 'p-3 group-hover:scale-105'}`}
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-[1.5rem] bg-white/80 border border-white/80 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/50 rounded-full border border-white flex items-center justify-center text-2xl">
              {emoji}
            </div>
          </div>
        )}
        <div className="absolute top-4 left-4 bg-pos-surface/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-bold text-pos-text border border-pos-border uppercase tracking-widest">
          {categoryName}
        </div>
        <div className="absolute top-4 right-4 bg-brand-500 text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-brand/20">
          Stock: {product.stockQuantity ?? 0}
        </div>
      </div>
      <div className="p-6 pt-3 flex flex-col gap-4">
        <h3 className="font-bold text-sm text-pos-text uppercase leading-tight tracking-tight min-h-[2.5rem] flex items-center">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-pos-text-muted uppercase tracking-widest leading-none mb-1">Prix</span>
            <span className="font-bold text-brand-600 text-lg leading-none">{product.price.toLocaleString()} <span className="text-[10px] text-pos-text-muted">FCFA</span></span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-brand-50 group-hover:bg-brand-500 flex items-center justify-center text-brand-600 group-hover:text-white transition-all shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}
