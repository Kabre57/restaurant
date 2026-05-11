'use client'

import React from 'react'
import { X, Banknote as CashIcon } from 'lucide-react'
import { Numpad } from './Numpad'

interface PaymentModalProps {
  total: number
  amountReceived: string
  changeAmount: number | null
  onKey: (key: string) => void
  onDelete: () => void
  onClear: () => void
  onClose: () => void
  onFinalize: () => void
  isProcessing: boolean
}

export function PaymentModal({ 
  total, 
  amountReceived, 
  changeAmount, 
  onKey, 
  onDelete, 
  onClear, 
  onClose,
  onFinalize,
  isProcessing
}: PaymentModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        
        {/* Left Side: Summary */}
        <div className="bg-[#1a1d24] text-white p-12 flex flex-col justify-between md:w-1/2">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <CashIcon className="text-white w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Paiement Espèces</span>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total à Payer</span>
              <div className="text-5xl font-black tracking-tighter">
                {total.toLocaleString()} <span className="text-xl opacity-50">FCFA</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-12 border-t border-white/10">
            {changeAmount !== null && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2f9e44]">À Rendre au Client</span>
                <div className={`text-5xl font-black tracking-tighter ${changeAmount >= 0 ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
                  {Math.abs(changeAmount).toLocaleString()} <span className="text-xl opacity-50">FCFA</span>
                </div>
              </div>
            )}
            
            <button
              onClick={onFinalize}
              disabled={isProcessing || changeAmount === null || changeAmount < 0}
              className="w-full bg-[#2f9e44] hover:bg-[#2b8a3e] disabled:bg-white/10 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
            >
              {isProcessing ? "Encaissement..." : "Confirmer le Paiement"}
            </button>
          </div>
        </div>

        {/* Right Side: Numpad */}
        <div className="p-12 md:w-1/2 flex flex-col gap-8 relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529] transition-all">
            <X className="w-6 h-6" />
          </button>

          <div className="bg-[#f8f9fa] rounded-3xl p-6 border-2 border-[#212529] text-right">
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Montant Reçu</span>
            <div className="text-4xl font-black text-[#212529]">
              {amountReceived ? parseInt(amountReceived).toLocaleString() : '0'} <span className="text-lg">FCFA</span>
            </div>
          </div>

          <Numpad onKey={onKey} onDelete={onDelete} onClear={onClear} />
        </div>
      </div>
    </div>
  )
}
