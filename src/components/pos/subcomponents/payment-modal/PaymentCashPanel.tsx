// src/components/pos/subcomponents/payment-modal/PaymentCashPanel.tsx
'use client'

import React, { useMemo } from 'react'

type PaymentCashPanelProps = {
  amountReceived: string
  onKey: (key: string) => void
  onDelete: () => void
  onClear: () => void
  selectedBills?: { id: string; value: number }[]
  onAddBill?: (value: number) => void
  onRemoveBill?: (id: string) => void
  onResetBills?: () => void
  total?: number
  roundedTotal?: number | null
  roundingDiff?: number
  changeAmount?: number | null
  onFinalize?: () => void
}

// Couleurs et styles raffinés des billets (Afrique de l'Ouest FCFA - BCEAO) sur fond clair
const BILL_DEFINITIONS = [
  { value: 500, label: '500', color: 'from-[#7A4B3E]/10 to-[#5C342A]/15 border-[#7A4B3E]/30 text-[#5C342A]' },
  { value: 1000, label: '1 000', color: 'from-[#BD2C1E]/10 to-[#8F1A0F]/15 border-[#BD2C1E]/30 text-[#8F1A0F]' },
  { value: 2000, label: '2 000', color: 'from-[#553096]/10 to-[#3C1E6E]/15 border-[#553096]/30 text-[#3C1E6E]' },
  { value: 5000, label: '5 000', color: 'from-[#14754E]/10 to-[#0A4D32]/15 border-[#14754E]/30 text-[#0A4D32]' },
  { value: 10000, label: '10 000', color: 'from-[#1D5E9E]/10 to-[#113E6B]/15 border-[#1D5E9E]/30 text-[#113E6B]' },
]

export function PaymentCashPanel({
  amountReceived,
  selectedBills = [],
  onAddBill,
  onRemoveBill,
  onResetBills,
  total = 0,
  roundedTotal = null,
  roundingDiff = 0,
  changeAmount = 0,
  onFinalize,
}: PaymentCashPanelProps) {
  
  const numericAmount = useMemo(() => {
    return amountReceived ? parseInt(amountReceived) : 0
  }, [amountReceived])

  const billCounts = useMemo(() => {
    const counts: Record<number, number> = {
      500: 0, 1000: 0, 2000: 0, 5000: 0, 10000: 0, 20000: 0
    }
    selectedBills.forEach((bill) => {
      if (counts[bill.value] !== undefined) {
        counts[bill.value]++
      }
    })
    return counts
  }, [selectedBills])

  const handleRemoveBillByValue = (value: number) => {
    if (!onRemoveBill || !selectedBills) return
    const billToRemove = [...selectedBills].reverse().find((b) => b.value === value)
    if (billToRemove) {
      onRemoveBill(billToRemove.id)
    }
  }

  const isPaymentValid = selectedBills.length > 0 && changeAmount !== null && changeAmount >= 0 && (roundedTotal ?? total) > 0
  const isUnderpaid = changeAmount !== null && changeAmount < 0
  const paymentDeltaLabel = isUnderpaid ? 'Reste à payer' : 'À rendre au client'
  const paymentDeltaAmount = changeAmount === null ? 0 : Math.abs(changeAmount)

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e9ecef] shadow-md space-y-3.5 animate-in fade-in duration-300">
      
      {/* SECTION 1: SOUS-TOTAL & TOTAL NET (avec arrondi) */}
      <div className="py-1.5 border-b border-[#f1f3f5] space-y-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Sous-total</span>
            <span className="text-xs font-extrabold text-[#495057]">{total.toLocaleString()} FCFA</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#212529]">Total Net</span>
            <span className="text-sm font-black text-[#2f9e44]">
              {(roundedTotal ?? total).toLocaleString()} FCFA
            </span>
          </div>
        </div>
        {roundingDiff !== 0 && (
          <div className="flex items-center justify-end gap-1.5 animate-in fade-in duration-300">
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-600">Arrondi</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${roundingDiff > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {roundingDiff > 0 ? '+' : ''}{roundingDiff} FCFA
            </span>
          </div>
        )}
      </div>

      {/* SECTION 2: MONTANT REÇU */}
      <div className="bg-[#f8f9fa] rounded-2xl p-3 border border-[#e9ecef]">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#868e96]">Montant Reçu</span>
          <span className="text-xl font-black text-[#212529] tracking-tight mt-0.5">
            {numericAmount.toLocaleString()} <span className="text-[10px] text-[#adb5bd] font-extrabold">FCFA</span>
          </span>
        </div>
      </div>

      {/* SECTION 3: SÉLECTIONNER LES BILLETS */}
      <div className="space-y-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#868e96] block">Sélectionner les billets</span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {BILL_DEFINITIONS.map((bill) => (
            <button
              key={bill.value}
              type="button"
              onClick={() => onAddBill?.(bill.value)}
              className={`h-9 rounded-xl bg-gradient-to-br ${bill.color} border flex flex-col items-center justify-center transition-all duration-150 active:scale-95 hover:shadow hover:-translate-y-0.5`}
            >
              <span className="text-[6.5px] font-black opacity-55 leading-none">FCFA</span>
              <span className="text-[10px] font-black tracking-tight mt-0.5 leading-none">{bill.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 4: LIASSE DÉPOSÉE */}
      <div className="space-y-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#868e96] block">Liasse déposée</span>
        {selectedBills.length === 0 ? (
          <div className="h-8 flex items-center justify-center rounded-xl border border-dashed border-[#dee2e6] text-[9px] text-[#adb5bd] font-bold uppercase tracking-wider bg-[#f8f9fa]">
            Aucun billet déposé
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
            {BILL_DEFINITIONS.map((def) => {
              const count = billCounts[def.value]
              if (count === 0) return null
              return (
                <button
                  key={def.value}
                  type="button"
                  onClick={() => handleRemoveBillByValue(def.value)}
                  className={`px-2.5 py-1 rounded-xl bg-gradient-to-br ${def.color} border flex items-center gap-1 shadow-sm text-[10px] font-black hover:brightness-[1.08] active:scale-95 transition-all`}
                  title="Cliquer pour retirer un billet"
                >
                  <span>{def.label}</span>
                  <span className="bg-black/5 px-1 py-0.5 rounded text-[8px] font-black">({count})</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: VIDER LA LIASSE */}
      {selectedBills.length > 0 && (
        <div className="flex justify-center py-0.5">
          <button
            type="button"
            onClick={() => onResetBills?.()}
            className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors"
          >
            Vider la liasse
          </button>
        </div>
      )}

      {/* SECTION 6: SOLDE DU PAIEMENT */}
      <div className="border-t border-[#f1f3f5] pt-3 flex justify-between items-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#868e96]">{paymentDeltaLabel}</span>
        <span className={`text-xl font-black tracking-tight ${isUnderpaid ? 'text-[#e03131]' : 'text-[#2f9e44]'}`}>
          {paymentDeltaAmount.toLocaleString()} <span className="text-[10px] font-bold text-[#adb5bd]">FCFA</span>
        </span>
      </div>

      {/* SECTION 7: CONFIRMER LE PAIEMENT */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onFinalize}
          disabled={!isPaymentValid}
          className="w-full bg-[#2f9e44] hover:bg-[#2b8a3e] disabled:bg-[#e9ecef] disabled:text-[#adb5bd] disabled:cursor-not-allowed text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow active:scale-[0.98] text-center"
        >
          Confirmer le Paiement
        </button>
      </div>

    </div>
  )
}
