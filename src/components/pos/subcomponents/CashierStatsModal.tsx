'use client'

import React, { useState } from 'react'
import { User, X, TrendingUp, Lock, Coins, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ActiveShift {
  id: string
  startAmount: number
  openedByName: string
  openedAt: Date | string
}

interface CashierStatsModalProps {
  total: number
  cashierName: string
  onClose: () => void
  activeShift?: ActiveShift | null
  onCloseShift?: (endAmount: number) => Promise<any>
}

export function CashierStatsModal({ total, cashierName, onClose, activeShift, onCloseShift }: CashierStatsModalProps) {
  const [step, setStep] = useState<'stats' | 'close'>('stats')
  const [endAmountInput, setEndAmountInput] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [closeResult, setCloseResult] = useState<{ totalCashSales?: number; expectedAmount?: number; endAmount?: number } | null>(null)
  const [closeError, setCloseError] = useState<string | null>(null)

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCloseShift) return
    const amount = parseFloat(endAmountInput)
    if (isNaN(amount) || amount < 0) {
      setCloseError('Veuillez entrer un montant valide.')
      return
    }
    setIsClosing(true)
    setCloseError(null)
    const res = await onCloseShift(amount)
    setIsClosing(false)
    if (res?.success) {
      setCloseResult({
        totalCashSales: res.totalCashSales,
        expectedAmount: res.expectedAmount,
        endAmount: amount,
      })
    } else {
      setCloseError(res?.error || 'Erreur lors de la clôture.')
    }
  }

  const openedAt = activeShift?.openedAt
    ? new Date(activeShift.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  // ── Écran de confirmation de clôture réussie
  if (closeResult) {
    const ecart = (closeResult.endAmount ?? 0) - (closeResult.expectedAmount ?? 0)
    return (
      <div className="fixed inset-0 bg-[#1a1d24]/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative text-center">
          <button onClick={onClose} className="absolute top-8 right-8 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>

          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>

          <h3 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-1">Caisse Clôturée</h3>
          <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mb-8">Rapport de clôture</p>

          <div className="space-y-3 text-left">
            <div className="flex justify-between rounded-xl bg-[#f8f9fa] px-4 py-3">
              <span className="text-xs font-bold text-[#868e96]">Ventes espèces</span>
              <span className="text-xs font-black text-[#212529]">{(closeResult.totalCashSales ?? 0).toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between rounded-xl bg-[#f8f9fa] px-4 py-3">
              <span className="text-xs font-bold text-[#868e96]">Montant attendu</span>
              <span className="text-xs font-black text-[#212529]">{(closeResult.expectedAmount ?? 0).toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between rounded-xl bg-[#f8f9fa] px-4 py-3">
              <span className="text-xs font-bold text-[#868e96]">Montant compté</span>
              <span className="text-xs font-black text-[#212529]">{(closeResult.endAmount ?? 0).toLocaleString()} FCFA</span>
            </div>
            <div className={`flex justify-between rounded-xl px-4 py-3 ${ecart === 0 ? 'bg-green-50' : ecart > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <span className={`text-xs font-bold ${ecart === 0 ? 'text-green-700' : ecart > 0 ? 'text-blue-700' : 'text-red-700'}`}>Écart</span>
              <span className={`text-xs font-black ${ecart === 0 ? 'text-green-700' : ecart > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {ecart >= 0 ? '+' : ''}{ecart.toLocaleString()} FCFA
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-8 w-full rounded-2xl bg-[#212529] py-4 text-sm font-black uppercase tracking-widest text-white hover:opacity-90 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    )
  }

  // ── Formulaire de clôture
  if (step === 'close') {
    return (
      <div className="fixed inset-0 bg-[#1a1d24]/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative text-center">
          <button onClick={() => setStep('stats')} className="absolute top-8 left-8 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
          <button onClick={onClose} className="absolute top-8 right-8 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>

          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-10 h-10 text-red-500" />
          </div>

          <h3 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-1">Clôture de Caisse</h3>
          <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mb-8">Saisissez le montant réel en caisse</p>

          <form onSubmit={handleCloseShift} className="flex flex-col gap-4">
            <div className="relative">
              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#adb5bd]" />
              <input
                type="number"
                min="0"
                step="500"
                value={endAmountInput}
                onChange={(e) => setEndAmountInput(e.target.value)}
                placeholder="Montant compté (FCFA)"
                className="w-full rounded-2xl border border-[#e9ecef] bg-[#f8f9fa] py-4 pl-12 pr-4 text-sm font-semibold text-[#212529] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                required
              />
            </div>
            {closeError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {closeError}
              </div>
            )}
            <button
              type="submit"
              disabled={isClosing}
              className="w-full rounded-2xl bg-red-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 disabled:opacity-60"
            >
              {isClosing ? 'Clôture en cours...' : 'Confirmer la Clôture'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Écran principal des stats
  return (
    <div className="fixed inset-0 bg-[#1a1d24]/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative text-center">
        <button onClick={onClose} className="absolute top-8 right-8 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
        
        <div className="w-20 h-20 bg-[#f8f9fa] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <User className="w-10 h-10 text-[#212529]" />
        </div>
        
        <h3 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">{cashierName}</h3>
        {activeShift && (
          <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mb-2">
            Session ouverte à {openedAt} · Fond {activeShift.startAmount.toLocaleString()} FCFA
          </p>
        )}
        <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mb-10">Résumé de votre session</p>
        
        <div className="bg-[#212529] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
          <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-700" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block mb-3">Recettes du Jour</span>
          <div className="text-4xl font-black tracking-tighter">
            {total.toLocaleString()} <span className="text-lg opacity-50 font-bold">FCFA</span>
          </div>
        </div>
        
        <p className="mt-8 text-[9px] font-bold text-[#adb5bd] uppercase leading-loose">
          Ces chiffres sont basés sur les ventes<br/>effectuées depuis l&apos;ouverture de votre session.
        </p>

        {activeShift && onCloseShift && (
          <button
            onClick={() => setStep('close')}
            className="mt-6 w-full rounded-2xl border-2 border-red-200 bg-red-50 py-3.5 text-sm font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white hover:border-red-500"
          >
            Clôturer la Caisse
          </button>
        )}
      </div>
    </div>
  )
}
