'use client'

import type { PaymentMode } from '../../lib/pos-helpers'
import { PaymentModeSelector } from './PaymentModeSelector'

type PaymentSummaryPanelProps = {
  total: number
  discount: number
  changeAmount: number | null
  mode: PaymentMode
  paymentMethods: { id: string; name: string; type: string; icon: string | null }[]
  isProcessing: boolean
  onModeChange: (mode: PaymentMode) => void
  onFinalize: () => void
}

function getButtonClassName(type: string) {
  if (type === 'CASH') return 'bg-[#2f9e44] hover:bg-[#2b8a3e]'
  if (type === 'CARD') return 'bg-[#339af0] hover:bg-[#228be6]'
  if (type === 'MOBILE_MONEY') return 'bg-[#f59f00] hover:bg-[#e67700]'
  return 'bg-[#7048e8] hover:bg-[#5f3dc4]'
}

export function PaymentSummaryPanel({
  total,
  discount,
  changeAmount,
  mode,
  paymentMethods,
  isProcessing,
  onModeChange,
  onFinalize,
}: PaymentSummaryPanelProps) {
  const activeMethod = paymentMethods.find(m => m.name === mode)
  const activeMethodType = activeMethod?.type || 'OTHER'
  const netTotal = Math.max(0, total - discount)
  const cashDisabled = activeMethodType === 'CASH' && (changeAmount === null || changeAmount < 0)

  return (
    <div className="bg-[#1a1d24] text-white p-8 md:p-9 flex flex-col justify-between md:w-1/2 overflow-y-auto custom-scrollbar max-h-[90vh]">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Mode de Paiement</span>
        </div>

        <PaymentModeSelector mode={mode} onChange={onModeChange} paymentMethods={paymentMethods} />

        <div className="space-y-3.5">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sous-total</span>
            <p className="text-lg font-bold opacity-80">{total.toLocaleString()} FCFA</p>
          </div>

          {discount > 0 && (
            <div className="flex justify-between items-center bg-[#e03131] px-4 py-2 rounded-xl animate-in slide-in-from-left duration-300">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Remise Appliquée</span>
              <span className="text-sm font-black text-white">-{discount.toLocaleString()} FCFA</span>
            </div>
          )}

          <div className="pt-3.5 border-t border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Net</span>
            <div className="text-4xl font-black tracking-tighter">
              {netTotal.toLocaleString()} <span className="text-lg opacity-50">FCFA</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-8 border-t border-white/10">
        {activeMethodType === 'CASH' && changeAmount !== null && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2f9e44]">À Rendre au Client</span>
            <div className={`text-4xl font-black tracking-tighter ${changeAmount >= 0 ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
              {Math.abs(changeAmount).toLocaleString()} <span className="text-lg opacity-50">FCFA</span>
            </div>
          </div>
        )}

        <button
          onClick={onFinalize}
          disabled={isProcessing || cashDisabled}
          className={`w-full ${getButtonClassName(activeMethodType)} disabled:bg-white/10 text-white py-4.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95`}
        >
          {isProcessing ? 'Encaissement...' : 'Confirmer le Paiement'}
        </button>
      </div>
    </div>
  )
}

