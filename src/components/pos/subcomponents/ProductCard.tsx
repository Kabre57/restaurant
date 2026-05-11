'use client'

import React from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'

export type ProductCardItem = {
  id: string
  name: string
  price: number
  image?: string | null
}

interface ProductCardProps {
  product: ProductCardItem
  onAdd: () => void
  categoryName: string
}

export function ProductCard({ product, onAdd, categoryName }: ProductCardProps) {
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

  return (
    <div onClick={onAdd} className="bg-white rounded-3xl overflow-hidden border border-[#e9ecef] hover:border-[#212529] transition-all duration-300 cursor-pointer group flex flex-col shadow-sm hover:shadow-2xl hover:-translate-y-1.5">
      <div className="aspect-[4/3] bg-[#f8f9fa] relative overflow-hidden flex items-center justify-center p-4">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill sizes="250px" className="object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="text-5xl select-none group-hover:scale-110 transition-transform duration-300">{emoji}</div>
        )}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black text-[#212529] border border-[#e9ecef] uppercase tracking-widest">
          {categoryName}
        </div>
      </div>
      <div className="p-6 pt-2 flex flex-col gap-4">
        <h3 className="font-black text-sm text-[#212529] uppercase leading-tight tracking-tight min-h-[2.5rem] flex items-center">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest leading-none mb-1">Prix</span>
            <span className="font-black text-[#212529] text-lg leading-none">{product.price.toLocaleString()} <span className="text-[10px]">FCFA</span></span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#f8f9fa] group-hover:bg-[#212529] flex items-center justify-center group-hover:text-white transition-all shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}
