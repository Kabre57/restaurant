import React from 'react'
import { Utensils, X, ArrowLeft, LayoutGrid, History, Settings, Sun, Moon, LogOut } from 'lucide-react'
import Link from 'next/link'

interface KDSSidebarProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  isDarkMode: boolean
  toggleTheme: () => void
  setShowHistory: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  handleLogout: () => void
  btnActiveThemeClass: string
  asideThemeClass: string
}

/**
 * Composant de la barre latérale de navigation et d'actions rapides du KDS
 * @param props - Propriétés du composant KDSSidebar
 */
export default function KDSSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  isDarkMode,
  toggleTheme,
  setShowHistory,
  setShowSettings,
  handleLogout,
  btnActiveThemeClass,
  asideThemeClass
}: KDSSidebarProps) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[16rem] max-w-[84vw] flex-col gap-8 border-r px-4 py-6 shadow-sm transition-transform duration-300 lg:static lg:w-20 lg:max-w-none lg:translate-x-0 lg:items-center lg:px-0 lg:py-8 transition-colors ${asideThemeClass} ${
      isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex items-center justify-between lg:flex-col lg:gap-10">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${isDarkMode ? 'bg-amber-400 text-[#12141c]' : 'bg-[#212529] text-white'}`}>
          <Utensils className="h-6 w-6" />
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="rounded-xl p-2 text-[#adb5bd] transition-all hover:bg-[#f1f3f5] lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:items-center w-full lg:px-2">
        <Link href="/" className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-[#eceff4] hover:bg-[#2b303c]' : 'text-[#495057] hover:bg-[#f1f3f5]'} lg:flex-col lg:px-2 lg:text-[8px]`}>
          <ArrowLeft className="h-5 w-5" />
          <span className="lg:hidden xl:block">Retour</span>
        </Link>
        
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest ${btnActiveThemeClass} lg:flex-col lg:px-2 lg:text-[8px]`}>
          <LayoutGrid className="h-5 w-5" />
          <span className="lg:hidden xl:block">Cuisine</span>
        </div>

        <button 
          onClick={() => setShowHistory(true)}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-[#eceff4] hover:bg-[#2b303c]' : 'text-[#495057] hover:bg-[#f1f3f5]'} lg:flex-col lg:px-2 lg:text-[8px]`}
        >
          <History className="h-5 w-5" />
          <span className="lg:hidden xl:block text-center">Historique</span>
        </button>

        <button 
          onClick={() => setShowSettings(true)}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-[#eceff4] hover:bg-[#2b303c]' : 'text-[#495057] hover:bg-[#f1f3f5]'} lg:flex-col lg:px-2 lg:text-[8px]`}
        >
          <Settings className="h-5 w-5" />
          <span className="lg:hidden xl:block">Réglages</span>
        </button>
      </div>

      <div className="mt-auto flex flex-col gap-4 lg:items-center">
        <button 
          onClick={toggleTheme}
          className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-[#2b303c] text-yellow-400' : 'bg-[#f1f3f5] text-[#212529]'}`}
          title={isDarkMode ? 'Passer au Mode Clair' : 'Passer au Mode Sombre'}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#adb5bd] transition-all hover:bg-[#fff5f5] hover:text-[#e03131] lg:flex-col lg:px-2 lg:text-[8px]"
        >
          <LogOut className="h-5 w-5" />
          <span className="lg:hidden xl:block">Sortie</span>
        </button>
      </div>
    </aside>
  )
}
