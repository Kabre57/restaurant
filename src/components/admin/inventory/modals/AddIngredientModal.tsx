'use client'

import React, { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { createIngredient } from '@/app/actions/inventory'

interface Props {
  stores: { id: string, name: string }[]
  onClose: () => void
  onSuccess: () => void
}

export function AddIngredientModal({ stores, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    storeId: stores[0]?.id || '',
    name: '',
    unit: 'kg',
    quantity: '',
    minStock: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const res = await createIngredient({
      storeId: form.storeId,
      name: form.name,
      unit: form.unit,
      quantity: parseFloat(form.quantity) || 0,
      minStock: parseFloat(form.minStock) || 0
    })

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
            <h2 className="text-xl font-black uppercase tracking-tighter text-[#171717]">Nouvel Ingrédient</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">Ajouter au stock d'un restaurant</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[#F8F9FA]">
            <X className="h-6 w-6 text-[#adb5bd]" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Restaurant</label>
            <select
              required
              value={form.storeId}
              onChange={e => setForm({ ...form, storeId: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors appearance-none"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Nom de l'ingrédient</label>
            <input 
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              placeholder="Ex: Tomate fraîche"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Unité</label>
              <select
                required
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors appearance-none"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="cl">cl</option>
                <option value="unité">unité</option>
                <option value="bouteille">bouteille</option>
              </select>
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Qté</label>
              <input 
                required
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
                placeholder="10"
              />
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Stock Min</label>
              <input 
                required
                type="number"
                step="0.01"
                value={form.minStock}
                onChange={e => setForm({ ...form, minStock: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
                placeholder="2"
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
            Enregistrer Ingrédient
          </button>
        </form>
      </div>
    </div>
  )
}
