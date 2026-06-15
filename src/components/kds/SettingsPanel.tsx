import React, { useState } from 'react'
import { Settings, X, Volume2 } from 'lucide-react'
import { playNotificationSound } from '@/lib/sound'

export default function SettingsPanel({
  currentWarn,
  currentCrit,
  currentTone,
  isDarkMode,
  onClose,
  onSave
}: {
  currentWarn: number
  currentCrit: number
  currentTone: 'info' | 'success' | 'warning'
  isDarkMode: boolean
  onClose: () => void
  onSave: (warn: number, crit: number, tone: 'info' | 'success' | 'warning') => void
}) {
  const [warn, setWarn] = useState(currentWarn)
  const [crit, setCrit] = useState(currentCrit)
  const [tone, setTone] = useState(currentTone)

  return (
    <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl transition-colors animate-in zoom-in-95 duration-300 ${
      isDarkMode ? 'bg-[#181a20] text-white border border-[#2e3440]' : 'bg-white text-[#212529] border border-[#dee2e6]'
    }`}>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-current/10">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-black uppercase tracking-tight">Configuration KDS</h2>
        </div>
        <button 
          onClick={onClose} 
          className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-[#2b303c]' : 'hover:bg-[#f1f3f5]'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Section 1 : Seuils d'attente */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3">Seuils Alerte Temps Attente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#868e96] block mb-2">Attention (Minutes)</label>
              <input 
                type="number" 
                min="1"
                max="60"
                value={warn} 
                onChange={e => setWarn(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full px-4 py-3 rounded-xl font-bold font-mono focus:outline-none border ${
                  isDarkMode ? 'bg-[#1e222b] border-[#2e3440] text-white' : 'bg-[#f8f9fa] border-[#dee2e6] text-[#212529]'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#868e96] block mb-2">Critique (Minutes)</label>
              <input 
                type="number" 
                min="1"
                max="120"
                value={crit} 
                onChange={e => setCrit(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full px-4 py-3 rounded-xl font-bold font-mono focus:outline-none border ${
                  isDarkMode ? 'bg-[#1e222b] border-[#2e3440] text-white' : 'bg-[#f8f9fa] border-[#dee2e6] text-[#212529]'
                }`}
              />
            </div>
          </div>
          <p className="text-[9px] text-[#868e96] mt-2 italic font-semibold">
            L'en-tête du ticket passera à l'orange après {warn} min, et clignotera en rouge après {crit} min.
          </p>
        </div>

        {/* Section 2 : Sonorité des Notifications */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3">Tonalité Nouvelle Commande</h3>
          <div className="flex flex-col gap-2">
            {[
              { id: 'info', label: 'Ping Standard (Cuisine)', desc: 'Sonorité courte et nette' },
              { id: 'success', label: 'Carillon Mélodique (Loyverse)', desc: 'Double note montante' },
              { id: 'warning', label: 'Alerte Distincte (Loud)', desc: 'Idéal environnement bruyant' }
            ].map(item => (
              <label 
                key={item.id} 
                onClick={() => {
                  setTone(item.id as any)
                  playNotificationSound(item.id as any)
                }}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                  tone === item.id 
                    ? isDarkMode 
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                      : 'bg-[#FF6D00]/5 border-[#FF6D00]/30 text-[#FF6D00]'
                    : isDarkMode 
                      ? 'bg-[#12141c] border-transparent hover:border-[#2e3440]' 
                      : 'bg-[#f8f9fa] border-transparent hover:border-[#dee2e6]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-wide">{item.label}</span>
                  <span className="text-[9px] text-gray-500">{item.desc}</span>
                </div>
                <Volume2 className={`w-4 h-4 ${tone === item.id ? 'animate-bounce' : 'opacity-40'}`} />
              </label>
            ))}
          </div>
        </div>

        {/* Section 3 : Actions */}
        <div className="flex gap-3 pt-4 border-t border-current/10">
          <button 
            type="button"
            onClick={onClose}
            className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isDarkMode ? 'bg-[#2b303c] text-white hover:bg-[#343b4c]' : 'bg-[#f1f3f5] text-gray-700 hover:bg-[#e9ecef]'
            }`}
          >
            Annuler
          </button>
          <button 
            type="button"
            onClick={() => onSave(warn, crit, tone)}
            className="flex-2 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}
