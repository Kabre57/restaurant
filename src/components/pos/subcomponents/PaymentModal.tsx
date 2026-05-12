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
  onFinalize: (mode: string) => void
  isProcessing: boolean
  promoCode: string
  onPromoChange: (val: string) => void
  onApplyPromo: () => void
  discount: number
  selectedCustomer: any
  onCustomerSearch: (q: string) => void
  customerResults: any[]
  onSelectCustomer: (customer: any) => void
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
  isProcessing,
  promoCode,
  onPromoChange,
  onApplyPromo,
  discount,
  selectedCustomer,
  onCustomerSearch,
  customerResults,
  onSelectCustomer
}: PaymentModalProps) {
  const [mode, setMode] = React.useState<'ESPECES' | 'CB' | 'MOBILE_MONEY'>('ESPECES')

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        
        {/* Left Side: Summary */}
        <div className="bg-[#1a1d24] text-white p-12 flex flex-col justify-between md:w-1/2">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Mode de Paiement</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-8">
              <button onClick={() => setMode('ESPECES')} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${mode === 'ESPECES' ? 'bg-[#2f9e44] border-[#2f9e44] text-white shadow-lg shadow-green-500/20' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                <CashIcon className="w-5 h-5" />
                <span className="text-[9px] font-black tracking-widest">ESPÈCES</span>
              </button>
              <button onClick={() => setMode('CB')} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${mode === 'CB' ? 'bg-[#339af0] border-[#339af0] text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <span className="text-[9px] font-black tracking-widest">CARTE</span>
              </button>
              <button onClick={() => setMode('MOBILE_MONEY')} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${mode === 'MOBILE_MONEY' ? 'bg-[#f59f00] border-[#f59f00] text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span className="text-[9px] font-black tracking-widest">MOBILE</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sous-total</span>
                <p className="text-xl font-bold opacity-80">{total.toLocaleString()} FCFA</p>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between items-center bg-[#e03131] px-4 py-2 rounded-xl animate-in slide-in-from-left duration-300">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Remise Appliquée</span>
                  <span className="text-sm font-black text-white">-{discount.toLocaleString()} FCFA</span>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Net</span>
                <div className="text-5xl font-black tracking-tighter">
                  {Math.max(0, total - discount).toLocaleString()} <span className="text-xl opacity-50">FCFA</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-12 border-t border-white/10">
            {mode === 'ESPECES' && changeAmount !== null && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2f9e44]">À Rendre au Client</span>
                <div className={`text-5xl font-black tracking-tighter ${changeAmount >= 0 ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
                  {Math.abs(changeAmount).toLocaleString()} <span className="text-xl opacity-50">FCFA</span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => onFinalize(mode)}
              disabled={isProcessing || (mode === 'ESPECES' && (changeAmount === null || changeAmount < 0))}
              className={`w-full ${mode === 'ESPECES' ? 'bg-[#2f9e44] hover:bg-[#2b8a3e]' : mode === 'CB' ? 'bg-[#339af0] hover:bg-[#228be6]' : 'bg-[#f59f00] hover:bg-[#e67700]'} disabled:bg-white/10 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95`}
            >
              {isProcessing ? "Encaissement..." : "Confirmer le Paiement"}
            </button>
          </div>
        </div>

        {/* Right Side: Options & Numpad */}
        <div className="p-10 md:w-1/2 flex flex-col gap-6 relative bg-[#f8f9fa] overflow-y-auto custom-scrollbar">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529] transition-all z-10">
            <X className="w-6 h-6" />
          </button>

          {/* Section: Client & Fidélité */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Client & Fidélité</h4>
            {selectedCustomer ? (
              <div className="bg-white p-4 rounded-2xl border-2 border-[#2f9e44] flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-black text-[#212529] uppercase">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                  <p className="text-[9px] font-bold text-[#adb5bd] uppercase">{selectedCustomer.loyalty?.points || 0} Points</p>
                </div>
                <button onClick={() => onSelectCustomer(null)} className="text-[9px] font-black text-[#e03131] uppercase hover:underline">Retirer</button>
              </div>
            ) : (
              <div className="relative">
                <input 
                  type="text"
                  placeholder="RECHERCHER UN CLIENT (TÉLÉPHONE...)"
                  className="w-full bg-white border border-[#e9ecef] rounded-xl px-4 py-3 text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all uppercase"
                  onChange={(e) => onCustomerSearch(e.target.value)}
                />
                {customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#e9ecef] rounded-xl mt-2 shadow-2xl z-20 overflow-hidden">
                    {customerResults.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => onSelectCustomer(c)}
                        className="w-full text-left p-3 hover:bg-[#f8f9fa] border-b border-[#f1f3f5] last:border-0"
                      >
                        <p className="text-[10px] font-black text-[#212529] uppercase">{c.firstName} {c.lastName}</p>
                        <p className="text-[8px] font-bold text-[#adb5bd]">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Code Promo */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Promotion</h4>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="CODE PROMO"
                value={promoCode}
                onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
                className="flex-1 bg-white border border-[#e9ecef] rounded-xl px-4 py-3 text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all uppercase"
              />
              <button 
                onClick={onApplyPromo}
                className="bg-[#212529] text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Appliquer
              </button>
            </div>
          </div>

          {/* Section: Paiement ESPECES ou Autre */}
          {mode === 'ESPECES' ? (
            <div className="space-y-6 pt-4 border-t border-[#e9ecef]">
              <div className="bg-[#212529] rounded-3xl p-6 text-right shadow-xl">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Montant Reçu</span>
                <div className="text-4xl font-black text-white">
                  {amountReceived ? parseInt(amountReceived).toLocaleString() : '0'} <span className="text-lg opacity-50">FCFA</span>
                </div>
              </div>
              <Numpad onKey={onKey} onDelete={onDelete} onClear={onClear} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10 bg-white rounded-[2rem] border border-[#e9ecef]">
              <div className="w-16 h-16 bg-[#f8f9fa] rounded-full flex items-center justify-center">
                {mode === 'CB' ? (
                  <svg className="w-8 h-8 text-[#339af0]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                ) : (
                  <svg className="w-8 h-8 text-[#f59f00]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                )}
              </div>
              <p className="text-xs font-black text-[#212529] uppercase tracking-tight">Finaliser sur le terminal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
