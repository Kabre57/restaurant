'use client'

import type { ReactNode } from 'react'
import { Banknote as CashIcon } from 'lucide-react'
import type { PaymentMode } from '../../lib/pos-helpers'

type PaymentModeSelectorProps = {
  mode: PaymentMode
  onChange: (mode: PaymentMode) => void
}

function CardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function MobileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

const MODES: Array<{
  value: PaymentMode
  label: string
  activeClassName: string
  icon: ReactNode
}> = [
  {
    value: 'ESPECES',
    label: 'ESPÈCES',
    activeClassName: 'bg-[#2f9e44] border-[#2f9e44] text-white shadow-lg shadow-green-500/20',
    icon: <CashIcon className="w-5 h-5" />,
  },
  {
    value: 'CB',
    label: 'CARTE',
    activeClassName: 'bg-[#339af0] border-[#339af0] text-white shadow-lg shadow-blue-500/20',
    icon: <CardIcon />,
  },
  {
    value: 'MOBILE_MONEY',
    label: 'MOBILE',
    activeClassName: 'bg-[#f59f00] border-[#f59f00] text-white shadow-lg shadow-orange-500/20',
    icon: <MobileIcon />,
  },
]

export function PaymentModeSelector({ mode, onChange }: PaymentModeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {MODES.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
            mode === item.value
              ? item.activeClassName
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
          }`}
        >
          {item.icon}
          <span className="text-[9px] font-black tracking-widest">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
