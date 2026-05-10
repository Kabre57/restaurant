'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'

interface NumpadProps {
  onKey: (key: string) => void
  onDelete: () => void
  onClear: () => void
}

export function Numpad({ onKey, onDelete, onClear }: NumpadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'C']
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          onClick={() => {
            if (key === 'C') onClear()
            else onKey(key)
          }}
          className="h-14 rounded-xl bg-white border border-[#dee2e6] text-lg font-black text-[#212529] hover:bg-[#212529] hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        onClick={onDelete}
        className="col-span-3 h-10 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] text-[#e03131] font-black uppercase text-[8px] tracking-widest hover:bg-[#fff5f5] transition-all flex items-center justify-center gap-2"
      >
        <Trash2 className="w-3 h-3" /> Effacer dernier chiffre
      </button>
    </div>
  )
}
