'use client'

import React, { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { createCustomer } from '@/app/actions/clients'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function AddCustomerModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const res = await createCustomer(form)
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
            <h2 className="text-xl font-black uppercase tracking-tighter text-[#171717]">Nouveau Client</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">Ajouter au programme de fidélité</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[#F8F9FA]">
            <X className="h-6 w-6 text-[#adb5bd]" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Prénom</label>
              <input 
                required
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
                placeholder="Ex: Jean"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Nom</label>
              <input 
                required
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
                placeholder="Ex: Dupont"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Téléphone</label>
            <input 
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              placeholder="+225 01 02 03 04 05"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Email (Optionnel)</label>
            <input 
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              placeholder="jean.dupont@email.com"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6D00] py-4 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#E66200] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer le Client
          </button>
        </form>
      </div>
    </div>
  )
}
