'use client'

import React from 'react'
import { User, X, TrendingUp } from 'lucide-react'

interface CashierStatsModalProps {
  total: number
  cashierName: string
  onClose: () => void
}

export function CashierStatsModal({ total, cashierName, onClose }: CashierStatsModalProps) {
  return (
    <div className="fixed inset-0 bg-[#1a1d24]/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative text-center">
        <button onClick={onClose} className="absolute top-8 right-8 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
        
        <div className="w-20 h-20 bg-[#f8f9fa] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <User className="w-10 h-10 text-[#212529]" />
        </div>
        
        <h3 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">{cashierName}</h3>
        <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mb-10">Résumé de votre session</p>
        
        <div className="bg-[#212529] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
          <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-700" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block mb-3">Recettes du Jour</span>
          <div className="text-4xl font-black tracking-tighter">
            {total.toLocaleString()} <span className="text-lg opacity-50 font-bold">FCFA</span>
          </div>
        </div>
        
        <p className="mt-8 text-[9px] font-bold text-[#adb5bd] uppercase leading-loose">
          Ces chiffres sont basés sur les ventes<br/>effectuées depuis l'ouverture de votre session.
        </p>
      </div>
    </div>
  )
}
