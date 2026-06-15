// src/components/pos/subcomponents/payment-modal/PaymentCardPanel.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { X, RotateCcw, CreditCard } from 'lucide-react'

type PaymentCardPanelProps = {
  amountReceived: string
  onKey: (key: string) => void
  onDelete: () => void
  onClear: () => void
  selectedBills?: { id: string; value: number }[]
  onAddBill?: (value: number) => void
  onRemoveBill?: (id: string) => void
  onResetBills?: () => void
}

// Couleurs et styles des billets réels de l'Afrique de l'Ouest (FCFA - BCEAO)
const BILL_DEFINITIONS = [
  { value: 500, label: '500', color: 'from-[#7A4B3E] to-[#5C342A]', textColor: 'text-[#ffe8d6]', shadow: 'shadow-[#5C342A]/20' },
  { value: 1000, label: '1 000', color: 'from-[#BD2C1E] to-[#8F1A0F]', textColor: 'text-[#ffd8d4]', shadow: 'shadow-[#8F1A0F]/20' },
  { value: 2000, label: '2 000', color: 'from-[#553096] to-[#3C1E6E]', textColor: 'text-[#f3e8ff]', shadow: 'shadow-[#3C1E6E]/20' },
  { value: 5000, label: '5 000', color: 'from-[#14754E] to-[#0A4D32]', textColor: 'text-[#e6fffa]', shadow: 'shadow-[#0A4D32]/20' },
  { value: 10000, label: '10 000', color: 'from-[#1D5E9E] to-[#113E6B]', textColor: 'text-[#ebf8ff]', shadow: 'shadow-[#113E6B]/20' },
]

export function PaymentCardPanel({
  amountReceived,
  onClear,
  selectedBills = [],
  onAddBill,
  onRemoveBill,
  onResetBills,
}: PaymentCardPanelProps) {
  const [useFallback, setUseFallback] = useState(false)

  const numericAmount = useMemo(() => {
    return amountReceived ? parseInt(amountReceived) : 0
  }, [amountReceived])

  return (
    <div className="space-y-4 pt-3 border-t border-[#f1f3f5] select-none">
      {!useFallback ? (
        // Mode TPE par défaut
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center gap-3.5 py-6 bg-white dark:bg-[#151b2c] rounded-2xl border border-[#e9ecef] dark:border-[#242f4c] shadow-sm">
            <div className="w-14 h-14 bg-[#e8f4fd] dark:bg-[#1e293b] rounded-full flex items-center justify-center animate-pulse">
              <CreditCard className="w-7 h-7 text-[#339af0]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-[#212529] dark:text-white uppercase tracking-tight">Terminal de paiement connecté</p>
              <p className="text-[9.5px] font-bold text-[#868e96] uppercase tracking-wider">Veuillez insérer ou présenter la carte</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUseFallback(true)}
            className="w-full py-3.5 rounded-xl border-2 border-dashed border-[#dee2e6] dark:border-[#242f4c] text-[8.5px] font-black text-[#868e96] hover:text-[#212529] dark:hover:text-white hover:border-[#adb5bd] uppercase tracking-widest transition-all active:scale-95 text-center"
          >
            Le TPE ne répond pas ? Encaisser par Billets
          </button>
        </div>
      ) : (
        // Mode fallback avec les billets
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <span className="text-[9.5px] font-black uppercase tracking-[0.25em] text-[#e03131]">Secours : Saisie Billets</span>
            <button
              onClick={() => {
                setUseFallback(false)
                onClear()
                onResetBills?.()
              }}
              className="text-[9px] font-black text-[#339af0] uppercase tracking-wider hover:underline"
            >
              Retour au TPE
            </button>
          </div>

          {/* Affichage montant reçu */}
          <div className="bg-[#1A1D20] rounded-2xl p-4 shadow-xl relative overflow-hidden transition-all border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em]">Montant Reçu (Carte Alternative)</span>
              {numericAmount > 0 && (
                <button
                  onClick={() => {
                    onClear()
                    onResetBills?.()
                  }}
                  className="text-[#ff6b6b] hover:text-[#fa5252] transition-colors p-1.5 rounded-lg hover:bg-white/5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider"
                >
                  <RotateCcw className="w-3 h-3 stroke-[2.5px]" />
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="text-2xl font-extrabold text-white tracking-tight leading-none mt-1.5 flex items-baseline gap-1.5">
              <span>{numericAmount.toLocaleString()}</span>
              <span className="text-xs text-white/40 font-medium">FCFA</span>
            </div>
          </div>

          {/* Grille billets */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              {BILL_DEFINITIONS.map((bill) => (
                <button
                  key={bill.value}
                  type="button"
                  onClick={() => onAddBill?.(bill.value)}
                  className={`h-[4.75rem] rounded-xl bg-gradient-to-br ${bill.color} ${bill.textColor} px-3.5 py-2.5 relative overflow-hidden transition-all duration-300 active:scale-95 shadow-md ${bill.shadow} hover:-translate-y-0.5 flex flex-col justify-between text-left hover:brightness-[1.08] group`}
                >
                  <div className="absolute right-3 top-2 text-[8px] opacity-10 font-bold uppercase tracking-[0.3em] pointer-events-none group-hover:opacity-20 transition-opacity">
                    BCEAO
                  </div>
                  <span className="text-[7.5px] font-bold uppercase tracking-[0.2em] opacity-45 leading-none">FCFA</span>
                  <div className="flex items-baseline my-0.5">
                    <span className="text-lg font-black tracking-tighter leading-none whitespace-nowrap">
                      {bill.label}
                    </span>
                  </div>
                  <div className="text-[7px] font-semibold tracking-wider uppercase opacity-45 group-hover:opacity-65 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis">
                    Afrique de l&apos;Ouest
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pile de billets BCEAO déposés - Design de Liasse Premium */}
          {selectedBills.length > 0 && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center">
                <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-[#868e96]">Liasse déposée ({selectedBills.length})</span>
                <button
                  onClick={() => {
                    onClear()
                    onResetBills?.()
                  }}
                  className="text-[8.5px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest hover:underline"
                >
                  Vider la liasse
                </button>
              </div>
              
              <div className="flex flex-row flex-wrap pl-1.5 pr-4 py-2.5 min-h-[4.5rem] bg-[#f1f3f5] rounded-2xl gap-y-3 overflow-x-hidden overflow-y-auto no-scrollbar">
                {selectedBills.map((bill, index) => {
                  const def = BILL_DEFINITIONS.find((b) => b.value === bill.value) || BILL_DEFINITIONS[0]
                  return (
                    <div
                      key={bill.id}
                      style={{ zIndex: selectedBills.length - index }}
                      className={`relative -mr-2 bg-gradient-to-br ${def.color} ${def.textColor} w-[5.5rem] h-10 rounded-lg px-2 py-1.5 flex flex-col justify-between shadow-[2px_4px_6px_rgba(0,0,0,0.15)] border border-white/10 select-none animate-in slide-in-from-right-3 duration-300 group hover:-translate-y-1 hover:z-[50] transition-all`}
                    >
                      <button
                        type="button"
                        onClick={() => onRemoveBill?.(bill.id)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-700 transition-colors z-[60] active:scale-90"
                        title="Retirer ce billet"
                      >
                        <X className="w-2.5 h-2.5 stroke-[3px]" />
                      </button>
                      <span className="text-[5.5px] font-black tracking-widest opacity-60 uppercase leading-none">BCEAO</span>
                      <span className="text-[9.5px] font-black tracking-tight leading-none">{def.label}</span>
                      <span className="text-[5px] opacity-40 uppercase tracking-tighter leading-none">FCFA</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
