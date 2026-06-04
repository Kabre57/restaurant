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
    <div className="grid grid-cols-3 gap-3 select-none touch-manipulation">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          aria-label={key === 'C' ? 'Effacer tout' : `Chiffre ${key}`}
          onClick={() => {
            if (key === 'C') onClear()
            else onKey(key)
          }}
          className="h-14 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-border)] text-xl font-black text-[var(--ui-text)] hover:bg-[var(--ui-primary)] hover:border-transparent hover:text-white transition-all shadow-sm active:scale-90 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-primary)]"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        aria-label="Effacer le dernier chiffre"
        onClick={onDelete}
        className="col-span-3 h-12 rounded-2xl bg-[var(--ui-secondary-light)] border border-[var(--ui-border)] text-[var(--ui-danger)] font-black uppercase text-[10px] tracking-widest hover:bg-[var(--ui-danger-light)] transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-danger)]"
      >
        <Trash2 className="w-4 h-4" /> Effacer dernier chiffre
      </button>
    </div>
  )
}
