'use client'

import React, { useState } from 'react'
import { X, Check } from 'lucide-react'

export type ProductModifierType = {
  id: string
  name: string
  price: number
  isRequired: boolean
}

export type ProductWithModifiers = {
  id: string
  name: string
  price: number
  image?: string | null
  modifiers?: ProductModifierType[]
}

type ProductOptionModalProps = {
  product: ProductWithModifiers
  onConfirm: (selectedModifiers: ProductModifierType[]) => void
  onClose: () => void
}

/**
 * Modal permettant de sélectionner les options/modificateurs d'un produit
 * avant de l'ajouter au panier. Affiche le prix final ajusté en temps réel.
 */
export function ProductOptionModal({ product, onConfirm, onClose }: ProductOptionModalProps) {
  const [selected, setSelected] = useState<ProductModifierType[]>([])

  const modifiers = product.modifiers || []

  // Basculer la sélection d'un modificateur
  const handleToggle = (mod: ProductModifierType) => {
    if (selected.some((s) => s.id === mod.id)) {
      setSelected(selected.filter((s) => s.id !== mod.id))
    } else {
      setSelected([...selected, mod])
    }
  }

  // Calcul du prix total en temps réel
  const totalPrice = product.price + selected.reduce((sum, item) => sum + item.price, 0)

  // Validation des choix requis
  const requiredModifiers = modifiers.filter((m) => m.isRequired)
  const allRequiredChecked = requiredModifiers.every((req) =>
    selected.some((sel) => sel.id === req.id)
  )

  const handleAdd = () => {
    if (!allRequiredChecked) return
    onConfirm(selected)
  }

  return (
    <div className="fixed inset-0 bg-[#0f1115]/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden border border-[#e9ecef] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* En-tête du Modal */}
        <div className="flex items-center justify-between p-6 border-b border-[#f1f3f5]">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Options disponibles</span>
            <h3 className="text-lg font-black text-[#212529] uppercase tracking-tight mt-1">{product.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[#adb5bd] hover:bg-[#f8f9fa] hover:text-[#212529] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Liste des Modificateurs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {modifiers.length === 0 ? (
            <p className="text-center text-xs font-bold text-[#adb5bd] uppercase tracking-widest py-8">Aucune option disponible</p>
          ) : (
            modifiers.map((mod) => {
              const isChecked = selected.some((s) => s.id === mod.id)
              return (
                <div
                  key={mod.id}
                  onClick={() => handleToggle(mod)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'border-[#FF6D00] bg-[#fffaf5]'
                      : 'border-[#dee2e6] hover:border-[#212529] bg-[#f8f9fa]'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-black text-[#212529] uppercase tracking-tight flex items-center gap-2">
                      {mod.name}
                      {mod.isRequired && (
                        <span className="text-[8px] font-black text-[#e03131] bg-[#fff5f5] border border-[#ffc9c9] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          Requis
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">
                      {mod.price > 0 ? `+ ${mod.price.toLocaleString()} FCFA` : 'Sans supplément'}
                    </span>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                      isChecked
                        ? 'bg-[#FF6D00] border-[#FF6D00] text-white'
                        : 'border-[#dee2e6] bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-4 h-4" />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pied du Modal avec Prix Final */}
        <div className="p-6 border-t border-[#f1f3f5] bg-[#f8f9fa] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-[#868e96]">Total Produit</span>
            <span className="text-xl font-black tracking-tight text-[#212529]">
              {totalPrice.toLocaleString()} <span className="text-xs">FCFA</span>
            </span>
          </div>

          <button
            onClick={handleAdd}
            disabled={!allRequiredChecked}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6D00] py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 hover:bg-[#E66200] disabled:bg-[#adb5bd] disabled:shadow-none"
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  )
}
