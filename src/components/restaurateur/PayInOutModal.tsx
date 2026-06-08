'use client'

import React, { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, X } from 'lucide-react'
import { payIn, payOut } from '@/app/actions/caisse/cashDrawer'

interface PayInOutModalProps {
  isOpen: boolean
  onClose: () => void
  shiftId: string
  type: 'PAY_IN' | 'PAY_OUT'
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onRefresh: () => void
}

export default function PayInOutModal({
  isOpen,
  onClose,
  shiftId,
  type,
  onSuccess,
  onError,
  onRefresh,
}: PayInOutModalProps) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset inputs when modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setNote('')
    }
  }, [isOpen, type])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      onError('Veuillez entrer un montant positif.')
      return
    }

    setIsSubmitting(true)
    const noteText = note.trim() || (type === 'PAY_IN' ? 'Entrée d\'espèces manuelle' : 'Sortie d\'espèces manuelle')

    try {
      const res = type === 'PAY_IN'
        ? await payIn(shiftId, parsedAmount, noteText)
        : await payOut(shiftId, parsedAmount, noteText)

      if (res.success) {
        onSuccess(type === 'PAY_IN' ? 'Entrée de caisse enregistrée avec succès.' : 'Sortie de caisse enregistrée avec succès.')
        onRefresh()
        onClose()
      } else {
        onError(res.error || 'Erreur lors de l\'opération.')
      }
    } catch (err) {
      console.error(err)
      onError('Une erreur inattendue est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPayIn = type === 'PAY_IN'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
      <div 
        className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-2xl p-6 relative flex flex-col gap-6 transform transition-all duration-300 scale-100 animate-in slide-in-from-bottom-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
              isPayIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {isPayIn ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-gray-900">
                {isPayIn ? 'Ajouter des espèces' : 'Retirer des espèces'}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                {isPayIn ? 'Opération Pay-in (Entrée)' : 'Opération Pay-out (Sortie)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
              Montant (FCFA) *
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-16 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-gray-900"
                required
                autoFocus
                disabled={isSubmitting}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400 uppercase">
                FCFA
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
              Motif / Description *
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isPayIn ? 'Ex: Apport de monnaie, fond de roulement' : 'Ex: Achat fournitures, prélèvement ciment'}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-gray-900"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 active:scale-95 transition-all"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                isPayIn 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Confirmer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
