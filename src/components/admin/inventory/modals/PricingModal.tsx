'use client'

import React from 'react'
import { X, Loader2, Check } from 'lucide-react'

interface Props {
  pricingIngredient: {
    id: string
    name: string
    costPrice: number
    sellPrice: number
  } | null
  setPricingIngredient: (ing: any) => void
  pricingForm: {
    costPrice: string
    sellPrice: string
  }
  setPricingForm: React.Dispatch<React.SetStateAction<{
    costPrice: string
    sellPrice: string
  }>>
  isUpdatingPrices: boolean
  handlePricesSubmit: (e: React.FormEvent) => void
}

export function PricingModal({
  pricingIngredient,
  setPricingIngredient,
  pricingForm,
  setPricingForm,
  isUpdatingPrices,
  handlePricesSubmit
}: Props) {
  if (!pricingIngredient) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-scaleIn">
        <header className="flex items-center justify-between border-b border-[#F0F1F6] px-8 py-6">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter text-[#171717]">Tarifs de Stock</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">{pricingIngredient.name}</p>
          </div>
          <button onClick={() => setPricingIngredient(null)} className="rounded-full p-2 transition-all hover:bg-[#F8F9FA]">
            <X className="h-5 w-5 text-[#adb5bd]" />
          </button>
        </header>
        <form onSubmit={handlePricesSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Coût d'Achat Unitaire (F CFA)</label>
            <input
              required
              type="number"
              step="0.01"
              value={pricingForm.costPrice}
              onChange={e => setPricingForm({ ...pricingForm, costPrice: e.target.value })}
              placeholder="Ex: 500"
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Prix de Vente Estimé (F CFA)</label>
            <input
              required
              type="number"
              step="0.01"
              value={pricingForm.sellPrice}
              onChange={e => setPricingForm({ ...pricingForm, sellPrice: e.target.value })}
              placeholder="Ex: 1200"
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPrices}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[#FF6D00] hover:bg-[#E66200] transition-colors disabled:opacity-50"
          >
            {isUpdatingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mettre à jour
          </button>
        </form>
      </div>
    </div>
  )
}
