'use client'

import type { PaymentMode } from '../../lib/pos-helpers'

type PaymentTerminalPanelProps = {
  mode: Exclude<PaymentMode, 'ESPECES'>
}

function CardTerminalIcon() {
  return (
    <svg className="w-8 h-8 text-[#339af0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function MobileTerminalIcon() {
  return (
    <svg className="w-8 h-8 text-[#f59f00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

export function PaymentTerminalPanel({ mode }: PaymentTerminalPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10 bg-white rounded-[2rem] border border-[#e9ecef]">
      <div className="w-16 h-16 bg-[#f8f9fa] rounded-full flex items-center justify-center">
        {mode === 'CB' ? <CardTerminalIcon /> : <MobileTerminalIcon />}
      </div>
      <p className="text-xs font-black text-[#212529] uppercase tracking-tight">Finaliser sur le terminal</p>
    </div>
  )
}
