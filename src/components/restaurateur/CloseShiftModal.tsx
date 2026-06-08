'use client'

import React, { useState, useEffect } from 'react'
import { Lock, X, AlertTriangle, CheckCircle, Scale } from 'lucide-react'
import { closeShift } from '@/app/actions/caisse/cashDrawer'

interface ShiftOperation {
  id: string
  amount: number
  type: 'PAY_IN' | 'PAY_OUT'
  note: string | null
  createdAt: Date
}

interface CashDrawerShift {
  id: string
  openedByName: string
  openedAt: Date
  closedByName: string | null
  closedAt: Date | null
  startAmount: number
  endAmount: number | null
  expectedAmount: number | null
  status: 'OPEN' | 'CLOSED'
  operations: ShiftOperation[]
}

interface CloseShiftModalProps {
  isOpen: boolean
  onClose: () => void
  shift: CashDrawerShift
  totalCashSales: number
  expectedAmount: number
  userId: string
  userName: string
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onRefresh: () => void
}

export default function CloseShiftModal({
  isOpen,
  onClose,
  shift,
  totalCashSales,
  expectedAmount,
  userId,
  userName,
  onSuccess,
  onError,
  onRefresh,
}: CloseShiftModalProps) {
  const [endAmountInput, setEndAmountInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      setEndAmountInput('')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Calculate totals for rendering
  const totalPayIn = shift.operations
    .filter((o) => o.type === 'PAY_IN')
    .reduce((acc, curr) => acc + curr.amount, 0)
  
  const totalPayOut = shift.operations
    .filter((o) => o.type === 'PAY_OUT')
    .reduce((acc, curr) => acc + curr.amount, 0)

  const endAmountNum = endAmountInput === '' ? 0 : parseFloat(endAmountInput)
  const difference = isNaN(endAmountNum) ? 0 : endAmountNum - expectedAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseFloat(endAmountInput)
    if (isNaN(amount) || amount < 0) {
      onError('Veuillez entrer un montant de clôture valide.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await closeShift(shift.id, userId, userName, amount)
      if (res.success) {
        onSuccess('Caisse clôturée avec succès. Le rapport de rotation a été mis à jour.')
        onRefresh()
        onClose()
      } else {
        onError(res.error || 'Erreur lors de la clôture.')
      }
    } catch (err) {
      console.error(err)
      onError('Une erreur inattendue est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-white border border-gray-100 rounded-3xl shadow-2xl p-6 relative flex flex-col gap-5 transform transition-all duration-300 scale-100 animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-gray-900">
                Clôturer la Caisse
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                Session active ouverte par {shift.openedByName}
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

        {/* Shift Summary Cards */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Résumé de la session d&apos;espèces
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Fond initial :</span>
              <span className="font-bold text-gray-800">{shift.startAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Ventes espèces :</span>
              <span className="font-bold text-gray-800">+{totalCashSales.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Total Pay-in :</span>
              <span className="font-bold text-emerald-600">+{totalPayIn.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Total Pay-out :</span>
              <span className="font-bold text-rose-500">-{totalPayOut.toLocaleString()} FCFA</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
              Montant Attendu :
            </span>
            <span className="text-lg font-black text-gray-900">
              {expectedAmount.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        {/* Input & Discrepancy Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
              Comptage Réel en Espèces dans le tiroir *
            </label>
            <div className="relative">
              <input
                type="number"
                value={endAmountInput}
                onChange={(e) => setEndAmountInput(e.target.value)}
                placeholder="Ex: 53500"
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

          {/* Dynamic Discrepancy Display */}
          {endAmountInput !== '' && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
              difference === 0 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : difference > 0 
                  ? 'bg-blue-50 border-blue-100 text-blue-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              <div className="flex-shrink-0">
                {difference === 0 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : difference > 0 ? (
                  <Scale className="w-5 h-5 text-blue-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider">
                  Écart de caisse calculé
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {difference === 0 ? (
                    'Caisse parfaitement équilibrée. Aucun écart.'
                  ) : difference > 0 ? (
                    `Excédent de +${difference.toLocaleString()} FCFA.`
                  ) : (
                    `Déficit de ${difference.toLocaleString()} FCFA.`
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
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
              className="flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Confirmer la Clôture'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
