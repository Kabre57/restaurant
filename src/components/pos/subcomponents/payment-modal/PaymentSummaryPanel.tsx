'use client'

import type { PaymentMode } from '../../lib/pos-helpers'
import { PaymentModeSelector } from './PaymentModeSelector'

type PaymentSummaryPanelProps = {
  total: number
  discount: number
  changeAmount: number | null
  mode: PaymentMode
  isProcessing: boolean
  onModeChange: (mode: PaymentMode) => void
  onFinalize: () => void
}

function getButtonClassName(mode: PaymentMode) {
  if (mode === 'ESPECES') return 'bg-[#2f9e44] hover:bg-[#2b8a3e]'
  if (mode === 'CB') return 'bg-[#339af0] hover:bg-[#228be6]'
  return 'bg-[#f59f00] hover:bg-[#e67700]'
}

export function PaymentSummaryPanel({
  total,
  discount,
  changeAmount,
  mode,
  isProcessing,
  onModeChange,
  onFinalize,
}: PaymentSummaryPanelProps) {
  const netTotal = Math.max(0, total - discount)
  const cashDisabled = mode === 'ESPECES' && (changeAmount === null || changeAmount < 0)

  return (
    <div className="bg-[#1a1d24] text-white p-12 flex flex-col justify-between md:w-1/2">
      <div>
        <div className="flex items-center gap-3 mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Mode de Paiement</span>
        </div>

        <PaymentModeSelector mode={mode} onChange={onModeChange} />

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
              {netTotal.toLocaleString()} <span className="text-xl opacity-50">FCFA</span>
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
          onClick={onFinalize}
          disabled={isProcessing || cashDisabled}
          className={`w-full ${getButtonClassName(mode)} disabled:bg-white/10 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95`}
        >
          {isProcessing ? 'Encaissement...' : 'Confirmer le Paiement'}
        </button>
      </div>
    </div>
  )
}
