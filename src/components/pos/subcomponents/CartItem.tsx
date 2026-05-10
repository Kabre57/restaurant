'use client'

import React from 'react'
import { Minus, Plus } from 'lucide-react'

interface CartItemProps {
  item: any
  onAdd: () => void
  onSub: () => void
}

export function CartItem({ item, onAdd, onSub }: CartItemProps) {
  return (
    <div className="flex items-center gap-5 group py-4 border-b border-[#f1f3f5] last:border-0">
      <div className="w-14 h-14 rounded-2xl bg-[#f8f9fa] border border-[#e9ecef] flex items-center justify-center shrink-0 overflow-hidden relative">
        <span className="text-2xl opacity-40">🍽️</span>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <h4 className="font-black text-xs text-[#212529] uppercase tracking-tight leading-tight">{item.name}</h4>
        <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">{item.price.toLocaleString()} FCFA</span>
      </div>
      <div className="flex items-center gap-3 bg-[#f8f9fa] p-1.5 rounded-xl border border-[#e9ecef]">
        <button onClick={onSub} className="w-8 h-8 rounded-lg bg-white border border-[#e9ecef] flex items-center justify-center text-[#212529] hover:bg-[#212529] hover:text-white transition-all">
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
        <button onClick={onAdd} className="w-8 h-8 rounded-lg bg-white border border-[#e9ecef] flex items-center justify-center text-[#212529] hover:bg-[#212529] hover:text-white transition-all">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
