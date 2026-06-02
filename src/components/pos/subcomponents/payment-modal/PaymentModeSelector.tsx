'use client'

import type { ReactNode } from 'react'
import { Banknote as CashIcon, CreditCard as CardIcon, Smartphone as MobileIcon, DollarSign as OtherIcon } from 'lucide-react'
import type { PaymentMode } from '../../lib/pos-helpers'

type PaymentModeSelectorProps = {
  mode: PaymentMode
  onChange: (mode: PaymentMode) => void
  paymentMethods: { id: string; name: string; type: string; icon: string | null }[]
}

function getIconForType(type: string): ReactNode {
  switch (type) {
    case 'CASH': return <CashIcon className="w-4 h-4 stroke-[2.5px]" />
    case 'CARD': return <CardIcon className="w-4 h-4 stroke-[2.5px]" />
    case 'MOBILE_MONEY': return <MobileIcon className="w-4 h-4 stroke-[2.5px]" />
    default: return <OtherIcon className="w-4 h-4 stroke-[2.5px]" />
  }
}

function getActiveClassNameForType(type: string): string {
  switch (type) {
    case 'CASH': return 'bg-[#2f9e44] border-[#2f9e44] text-white shadow-lg shadow-green-500/20'
    case 'CARD': return 'bg-[#339af0] border-[#339af0] text-white shadow-lg shadow-blue-500/20'
    case 'MOBILE_MONEY': return 'bg-[#f59f00] border-[#f59f00] text-white shadow-lg shadow-orange-500/20'
    default: return 'bg-[#7048e8] border-[#7048e8] text-white shadow-lg shadow-purple-500/20'
  }
}

export function PaymentModeSelector({ mode, onChange, paymentMethods }: PaymentModeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">
      {paymentMethods.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.name)}
          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
            mode === item.name
              ? getActiveClassNameForType(item.type)
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
          }`}
        >
          {item.icon ? <span className="text-sm leading-none">{item.icon}</span> : getIconForType(item.type)}
          <span className="text-[8.5px] font-black tracking-widest uppercase">{item.name}</span>
        </button>
      ))}
    </div>
  )
}

