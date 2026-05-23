'use client'

import React from 'react'
import { X } from 'lucide-react'
import Image from 'next/image'
import { Product, Category } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductOption = {
  id: string
  name: string
  price: number
  type: 'SUPPLEMENT' | 'REMOVAL'
  categoryId: string | null
}

type CustomizationOptions = {
  supplements: ProductOption[]
  removals: ProductOption[]
}

interface ProductCustomizerModalProps {
  product: Product & { category: Category }
  options: CustomizationOptions
  selectedSupplements: string[]
  selectedRemovals: string[]
  specialInstructions: string
  priceTotal: number
  onToggleSupplement: (name: string) => void
  onToggleRemoval: (name: string) => void
  onInstructionsChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function getProductEmoji(name: string, categoryName: string): string {
  const n = name.toLowerCase()
  const c = categoryName.toLowerCase()
  if (n.includes('burger')) return '🍔'
  if (n.includes('frite') || n.includes('patate')) return '🍟'
  if (n.includes('coca') || n.includes('soda') || n.includes('boisson') || n.includes('eau') || n.includes('jus')) return '🥤'
  if (n.includes('wrap') || n.includes('poulet')) return '🌯'
  if (n.includes('salade')) return '🥗'
  if (n.includes('dessert') || n.includes('glace') || n.includes('gateau')) return '🍰'
  if (n.includes('pizza')) return '🍕'
  if (c.includes('burger')) return '🍔'
  if (c.includes('accompagnement')) return '🍟'
  if (c.includes('boisson')) return '🥤'
  if (c.includes('dessert')) return '🍰'
  return '🍽️'
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Modal de personnalisation d'un produit (suppléments, retraits, instructions).
 * Extrait de CustomerOrderClient.tsx (était ligne 455-596).
 */
export default function ProductCustomizerModal({
  product,
  options,
  selectedSupplements,
  selectedRemovals,
  specialInstructions,
  priceTotal,
  onToggleSupplement,
  onToggleRemoval,
  onInstructionsChange,
  onConfirm,
  onClose,
}: ProductCustomizerModalProps) {
  const emoji = getProductEmoji(product.name, product.category.name)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#171717]">Personnaliser</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#F8F9FA] rounded-full text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">

          {/* Product Info */}
          <div className="flex gap-4 bg-[#F8F9FA] rounded-2xl p-4 border border-[#E5E7EB]/50">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shrink-0 border border-[#E5E7EB]">
              {product.image ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <Image src={product.image} alt={product.name} fill unoptimized className="object-cover" />
                </div>
              ) : (
                <span className="text-3xl select-none">{emoji}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-[#171717]">{product.name}</h3>
              <p className="text-[10px] font-bold text-[#868e96] mt-1 leading-relaxed">
                {product.description || 'Option personnalisable selon vos préférences.'}
              </p>
            </div>
          </div>

          {/* Suppléments */}
          {options.supplements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#171717]">Suppléments</h4>
                <span className="text-[9px] font-bold text-[#868e96] bg-[#F8F9FA] px-2 py-0.5 rounded-lg border border-[#E5E7EB]">Optionnel</span>
              </div>
              <div className="space-y-2">
                {options.supplements.map((opt) => {
                  const isSelected = selectedSupplements.includes(opt.name)
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between border rounded-2xl p-4 cursor-pointer transition-colors ${
                        isSelected ? 'border-[#FF6D00] bg-[#FF6D00]/5' : 'border-[#E5E7EB] bg-white hover:border-[#FF6D00]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSupplement(opt.name)}
                          className="w-4 h-4 rounded text-[#FF6D00] border-[#E5E7EB] focus:ring-[#FF6D00]"
                        />
                        <span className="text-xs font-black text-[#171717]">{opt.name}</span>
                      </div>
                      <span className="text-xs font-black text-[#FF6D00]">+ {opt.price.toLocaleString()} F CFA</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Retraits */}
          {options.removals.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#171717]">Retirer des ingrédients</h4>
                <span className="text-[9px] font-bold text-[#868e96] bg-[#F8F9FA] px-2 py-0.5 rounded-lg border border-[#E5E7EB]">Optionnel</span>
              </div>
              <div className="space-y-2">
                {options.removals.map((opt) => {
                  const isSelected = selectedRemovals.includes(opt.name)
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 border rounded-2xl p-4 cursor-pointer transition-colors ${
                        isSelected ? 'border-[#FF6D00] bg-[#FF6D00]/5' : 'border-[#E5E7EB] bg-white hover:border-[#FF6D00]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleRemoval(opt.name)}
                        className="w-4 h-4 rounded text-[#FF6D00] border-[#E5E7EB] focus:ring-[#FF6D00]"
                      />
                      <span className="text-xs font-black text-[#171717]">{opt.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Instructions spéciales */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#171717] mb-3">Instructions spéciales</h4>
            <textarea
              placeholder="Ex: sans sel, viande bien cuite, sauce à part..."
              value={specialInstructions}
              onChange={(e) => onInstructionsChange(e.target.value)}
              className="w-full min-h-[5rem] rounded-2xl border border-[#E5E7EB] bg-white p-4 text-xs font-bold text-black outline-none placeholder-[#adb5bd] focus:border-[#FF6D00] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E5E7EB] bg-white sticky bottom-0 z-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#868e96]">Prix total</p>
            <p className="text-base font-black text-[#171717] mt-0.5">{priceTotal.toLocaleString()} F CFA</p>
          </div>
          <button
            onClick={onConfirm}
            className="bg-[#171717] hover:bg-black text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 shadow-md shadow-black/10"
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  )
}
