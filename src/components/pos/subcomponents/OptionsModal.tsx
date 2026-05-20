'use client'

import React, { useState } from 'react'

interface OptionsModalProps {
  item: { name: string, options?: string }
  onSave: (options: string) => void
  onClose: () => void
}

export function OptionsModal({ item, onSave, onClose }: OptionsModalProps) {
  const [val, setVal] = useState(item?.options || "")
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Options</h2>
        <p className="text-xs font-bold text-[#adb5bd] mb-6 uppercase tracking-widest">{item.name}</p>
        
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Ex: Saignant, sans oignons..."
          className="w-full h-32 bg-[#f8f9fa] border border-[#e9ecef] rounded-2xl p-4 text-sm font-bold text-[#212529] focus:ring-2 focus:ring-[#212529] outline-none resize-none mb-6"
          autoFocus
        />

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Annuler</button>
          <button 
            onClick={() => onSave(val)}
            className="flex-1 py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-black/10"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
