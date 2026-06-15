'use client'

import React from 'react'
import {
  TrendingUp, PlusCircle, ArrowUpRight, MinusCircle, ArrowDownRight, Lock
} from 'lucide-react'
import type { CashDrawerShift } from '../types'

interface QuickAdjustmentsProps {
  activeShift: CashDrawerShift | null
  expectedAmount: number
  onTriggerAdjustment: (type: 'PAY_IN' | 'PAY_OUT') => void
}

export function QuickAdjustments({
  activeShift,
  expectedAmount,
  onTriggerAdjustment
}: QuickAdjustmentsProps) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-4">
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
        <TrendingUp className="w-4 h-4 text-orange-600" />
        Ajustements Rapides
      </h2>

      {activeShift ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Ajoutez ou retirez manuellement des espèces du tiroir (ex: apport fonds, retrait fournisseur, monnaie).
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onTriggerAdjustment('PAY_IN')}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              <span className="flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Ajout (Ajoute des espèces)
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onTriggerAdjustment('PAY_OUT')}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-rose-700 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              <span className="flex items-center gap-1.5">
                <MinusCircle className="w-4 h-4" />
                Retrait (retrait)
              </span>
              <ArrowDownRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span>Espèces Actuelles Attendues :</span>
              <span className="text-gray-900 text-xs font-black">{expectedAmount.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 space-y-2">
          <Lock className="w-8 h-8 mx-auto text-gray-300" />
          <p className="text-xs font-medium leading-relaxed max-w-[200px] mx-auto">
            Veuillez ouvrir la caisse pour effectuer des ajustements de caisse.
          </p>
        </div>
      )}
    </div>
  )
}
