'use client'

import React, { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { createUser } from '@/app/actions/users'

interface Props {
  stores: { id: string, name: string }[]
  onClose: () => void
  onSuccess: () => void
}

export function AddUserModal({ stores, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER' as 'RESTAURATEUR' | 'CASHIER' | 'KITCHEN' | 'SERVER',
    storeId: stores[0]?.id || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const res = await createUser({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      storeId: form.storeId
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
            <h2 className="text-xl font-black uppercase tracking-tighter text-[#171717]">Nouveau Collaborateur</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">Création de compte d'accès</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[#F8F9FA]">
            <X className="h-6 w-6 text-[#adb5bd]" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Nom Complet</label>
            <input 
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              placeholder="Ex: Martin Caissier"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Email de connexion</label>
            <input 
              required
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              placeholder="martin@restaurant.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Mot de passe (Optionnel)</label>
            <input 
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors"
              placeholder="Sera password123 par défaut si vide"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Rôle</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as any })}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none transition-colors appearance-none"
              >
                <option value="CASHIER">Caissier (POS)</option>
                <option value="KITCHEN">Cuisine (KDS)</option>
                <option value="SERVER">Serveur</option>
                <option value="RESTAURATEUR">Gérant</option>
              </select>
            </div>

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
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6D00] py-4 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#E66200] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Créer le compte
          </button>
        </form>
      </div>
    </div>
  )
}
