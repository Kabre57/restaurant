'use client'

import React from 'react'
import { Menu, Radio } from 'lucide-react'
import { StatusCounter } from '../KDSColumn'
import type { StreamStatus } from '../types'

interface KDSHeaderProps {
  isDarkMode: boolean
  setIsSidebarOpen: (val: boolean) => void
  storeName: string
  prepZone: 'ALL' | 'CUISINE' | 'BAR'
  setPrepZone: (val: 'ALL' | 'CUISINE' | 'BAR') => void
  pendingOrdersCount: number
  preparingOrdersCount: number
  readyOrdersCount: number
  streamStatus: StreamStatus
  retryDelay: number
  currentTime: string
}

export function KDSHeader({
  isDarkMode,
  setIsSidebarOpen,
  storeName,
  prepZone,
  setPrepZone,
  pendingOrdersCount,
  preparingOrdersCount,
  readyOrdersCount,
  streamStatus,
  retryDelay,
  currentTime
}: KDSHeaderProps) {
  const headerThemeClass = isDarkMode ? 'bg-[#181a20] border-[#2e3440] text-white' : 'bg-white border-[#dee2e6]'
  const textMutedThemeClass = isDarkMode ? 'text-[#8c96a5]' : 'text-[#adb5bd]'
  const btnActiveThemeClass = isDarkMode ? 'bg-[#2b303c] text-amber-400 shadow-md border border-amber-400/20' : 'bg-[#212529] text-white shadow-lg'

  const streamLabel = streamStatus === 'connected'
    ? 'Flux connecté'
    : streamStatus === 'connecting'
      ? 'Connexion flux'
      : `Reconnexion ${Math.ceil(retryDelay / 1000)}s`

  return (
    <header className={`border-b px-4 py-4 z-10 shadow-sm md:px-6 lg:px-10 transition-colors ${headerThemeClass}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-start gap-4 xl:items-center xl:gap-6">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all lg:hidden ${
              isDarkMode ? 'border-[#2e3440] bg-[#1e222b]' : 'border-[#dee2e6] bg-[#f8f9fa]'
            }`}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Écran Cuisine KDS</h1>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${textMutedThemeClass}`}>{storeName}</p>
          </div>

          <div className={`flex overflow-x-auto p-1 rounded-xl border no-scrollbar transition-all ${
            isDarkMode ? 'bg-[#12141c] border-[#2e3440]' : 'bg-[#f1f3f5] border-[#e9ecef]'
          }`}>
            <button
              onClick={() => setPrepZone('ALL')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                prepZone === 'ALL'
                  ? btnActiveThemeClass
                  : `${isDarkMode ? 'text-[#8c96a5] hover:text-white' : 'text-[#adb5bd] hover:text-[#212529]'}`
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setPrepZone('CUISINE')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                prepZone === 'CUISINE'
                  ? btnActiveThemeClass
                  : `${isDarkMode ? 'text-[#8c96a5] hover:text-white' : 'text-[#adb5bd] hover:text-[#212529]'}`
              }`}
            >
              Cuisine
            </button>
            <button
              onClick={() => setPrepZone('BAR')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                prepZone === 'BAR'
                  ? btnActiveThemeClass
                  : `${isDarkMode ? 'text-[#8c96a5] hover:text-white' : 'text-[#adb5bd] hover:text-[#212529]'}`
              }`}
            >
              Bar
            </button>
          </div>

          <div className="hidden h-8 w-px bg-current opacity-10 xl:block" />

          <div className="flex flex-wrap items-center gap-4">
            <StatusCounter label="À PRÉPARER" count={pendingOrdersCount} color="bg-[#e03131]" isDarkMode={isDarkMode} />
            <StatusCounter label="EN COURS" count={preparingOrdersCount} color="bg-[#f08c00]" isDarkMode={isDarkMode} />
            <StatusCounter label="PRÊT" count={readyOrdersCount} color="bg-[#2f9e44]" isDarkMode={isDarkMode} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 xl:justify-end">
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
            streamStatus === 'connected'
              ? 'border-[#b2f2bb] bg-[#ebfbee] text-[#2f9e44]'
              : 'border-[#ffe066] bg-[#fff9db] text-[#f08c00]'
          }`}>
            <Radio className={`h-4 w-4 ${streamStatus !== 'connected' ? 'animate-pulse' : ''}`} />
            {streamLabel}
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] font-black uppercase tracking-widest ${textMutedThemeClass}`}>Temps Réel</span>
            <span className="text-xs font-bold uppercase tracking-widest font-mono">{currentTime || '--:--:--'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
