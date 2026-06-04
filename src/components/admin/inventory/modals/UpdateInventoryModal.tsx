'use client'

import React, { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { updateInventory } from '@/app/actions/inventory'

interface Props {
  inventory: {
    id: string
    quantity: number
    minStock: number
    ingredient: { name: string; unit: string }
    store: { name: string }
  }
  onClose: () => void
  onSuccess: () => void
}

export function UpdateInventoryModal({ inventory, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    quantity: inventory.quantity.toString(),
    minStock: inventory.minStock.toString()
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const res = await updateInventory(
      inventory.id,
      parseFloat(form.quantity) || 0,
      parseFloat(form.minStock) || 0
    )

    if (res.success) {
      onSuccess()
    } else {
      setError(res.error || "Une erreur est survenue")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-scaleIn">
        <header className="flex items-center justify-between border-b border-[#F0F1F6] px-8 py-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-[#171717]">Ajuster le Stock</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">
              {inventory.ingredient.name} — {inventory.store.name}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[#F8F9FA]">
            <X className="h-6 w-6 text-[#adb5bd]" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Qté en stock ({inventory.ingredient.unit})
              </label>
              <input 
                required
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Stock de sécurité min.
              </label>
              <input 
                required
                type="number"
                step="0.01"
                value={form.minStock}
                onChange={e => setForm({ ...form, minStock: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6D00] py-4 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#E66200] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mettre à jour le stock
          </button>
        </form>
      </div>
    </div>
  )
}
