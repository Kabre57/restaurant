'use client'

import React from 'react'
import {
  TrendingUp, Printer, ArrowUpRight, ArrowDownRight, HelpCircle, Lock
} from 'lucide-react'
import type { CashDrawerShift } from '../types'

interface ActiveSessionCardProps {
  activeShift: CashDrawerShift
  totalCashSales: number
  expectedAmount: number
  activePayIn: number
  activePayOut: number
  onPrintReport: () => void
  onCloseShift: () => void
}

export function ActiveSessionCard({
  activeShift,
  totalCashSales,
  expectedAmount,
  activePayIn,
  activePayOut,
  onPrintReport,
  onCloseShift
}: ActiveSessionCardProps) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Session Active</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Ouverte par : {activeShift.openedByName} • le {new Date(activeShift.openedAt).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
        
        {/* Print Active Report */}
        <button
          onClick={onPrintReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 active:scale-95 transition-all text-xs font-bold w-fit"
        >
          <Printer className="w-4 h-4" />
          Imprimer rapport live
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Fond Initial</span>
          <span className="text-lg font-black text-gray-900 mt-2">
            {activeShift.startAmount.toLocaleString()} FCFA
          </span>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ventes Espèces (CASH)</span>
          <span className="text-lg font-black text-emerald-600 mt-2">
            +{totalCashSales.toLocaleString()} FCFA
          </span>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">Montant Attendu</span>
          <span className="text-lg font-black text-orange-700 mt-2">
            {expectedAmount.toLocaleString()} FCFA
          </span>
        </div>
      </div>

      {/* Quick adjustments summary */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex justify-between items-center text-xs">
          <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Entrées (Ajoute des espèces)</span>
          <span className="font-black text-emerald-600">+{activePayIn.toLocaleString()} FCFA</span>
        </div>
        <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex justify-between items-center text-xs">
          <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Sorties (retrait)</span>
          <span className="font-black text-rose-500">-{activePayOut.toLocaleString()} FCFA</span>
        </div>
      </div>

      {/* Operations timeline */}
      <div className="space-y-2 pt-4 border-t border-gray-100">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Journal des Ajustements Manuels</h3>
        {activeShift.operations.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucune opération Ajoute des espèces ou retrait sur ce shift.</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto pr-1">
            {activeShift.operations.map((op) => (
              <div key={op.id} className="flex items-center justify-between py-2 text-xs">
                <div className="flex items-center gap-2.5">
                  {op.type === 'PAY_IN' ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <ArrowDownRight className="w-4 h-4" />
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-gray-800">{op.note || '—'}</p>
                    <p className="text-[9px] text-gray-400 font-medium">
                      {new Date(op.createdAt).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className={`font-black ${op.type === 'PAY_IN' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {op.type === 'PAY_IN' ? '+' : '-'}{op.amount.toLocaleString()} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Button Container */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
          <HelpCircle className="w-4 h-4" />
          <span>Prêt à fermer ? Comptez la caisse avant de clôturer.</span>
        </div>
        <button
          type="button"
          onClick={onCloseShift}
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all"
        >
          <Lock className="w-4 h-4" />
          Clôturer la caisse
        </button>
      </div>

    </div>
  )
}
