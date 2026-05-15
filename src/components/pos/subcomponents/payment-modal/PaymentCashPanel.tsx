'use client'

import { Numpad } from '../Numpad'

type PaymentCashPanelProps = {
  amountReceived: string
  onKey: (key: string) => void
  onDelete: () => void
  onClear: () => void
}

export function PaymentCashPanel({
  amountReceived,
  onKey,
  onDelete,
  onClear,
}: PaymentCashPanelProps) {
  return (
    <div className="space-y-6 pt-4 border-t border-[#e9ecef]">
      <div className="bg-[#212529] rounded-3xl p-6 text-right shadow-xl">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Montant Reçu</span>
        <div className="text-4xl font-black text-white">
          {amountReceived ? parseInt(amountReceived).toLocaleString() : '0'} <span className="text-lg opacity-50">FCFA</span>
        </div>
      </div>
      <Numpad onKey={onKey} onDelete={onDelete} onClear={onClear} />
    </div>
  )
}
