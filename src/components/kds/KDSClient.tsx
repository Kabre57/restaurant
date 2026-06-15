'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Check, Play, Utensils, LayoutGrid, Radio,
  Menu, X, LogOut, BellRing, Settings, History, Volume2,
  Sun, Moon, RotateCcw, AlertTriangle, MessageSquare, ClipboardCheck
} from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders/orders'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { KDSColumn, StatusCounter, type OrderStatus } from './KDSColumn'
import { playNotificationSound } from '@/lib/sound'
import SettingsPanel from './SettingsPanel'
import { useKDSRealtime } from './hooks/useKDSRealtime'

type StreamStatus = 'connecting' | 'connected' | 'reconnecting'

type OrderItem = {
  id: string
  quantity: number
  options: string | null
  product: {
    name: string
    category: { name: string }
  }
}

export type KDSOrder = {
  id: string
  status: string
  storeId: string
  type: string
  createdAt: Date
  estimatedPrepMinutes?: number | null
  estimatedReadyAt?: Date | string | null
  actualPrepMinutes?: number | null
  preparationStartedAt?: Date | string | null
  readyAt?: Date | string | null
  servedAt?: Date | string | null
  items: OrderItem[]
  table?: { number: number } | null
  customerNotes?: string | null
}

type Order = Omit<KDSOrder, 'status'> & { status: OrderStatus }

type ServerCallAlert = {
  tableId: string
  tableNumber?: number
  timestamp: string
}

type KitchenAlert = {
  id: string
  message: string
  tone: 'info' | 'success' | 'warning'
}

function normalizeStatus(status: string): OrderStatus {
  if (status === 'PRÉPARATION' || status === 'PREPARATION') return 'PREPARATION'
  if (status === 'PRÊT' || status === 'PRET') return 'PRET'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELLED') return 'CANCELLED'
  return 'EN_ATTENTE'
}

function normalizeOrder(order: KDSOrder): Order {
  return {
    ...order,
    status: normalizeStatus(order.status),
    createdAt: new Date(order.createdAt)
  }
}

export default function KDSClient({ initialOrders, storeId, storeName }: { initialOrders: KDSOrder[], storeId: string, storeName: string }) {
  const router = useRouter()
  const [prepZone, setPrepZone] = useState<'ALL' | 'CUISINE' | 'BAR'>('ALL')
  const [currentTime, setCurrentTime] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Loyverse Advanced KDS states
  const [isDarkMode, setIsDarkMode] = useState(true) // Dark mode par défaut pour la cuisine
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Seuils de couleur de ticket configurables (Minutes)
  const [warningThreshold, setWarningThreshold] = useState(5)
  const [criticalThreshold, setCriticalThreshold] = useState(10)

  // Customisation sonore
  const [soundTone, setSoundTone] = useState<'info' | 'success' | 'warning'>('info')

  // Suivi de l'avancement individuel des articles
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})

  // Utilisation du hook temps réel & offline
  const {
    orders,
    streamStatus,
    retryDelay,
    serverCalls,
    setServerCalls,
    kitchenAlerts,
    setKitchenAlerts,
    pendingActions,
    completedHistory,
    handleUpdateStatus,
    handleMoveStatusBackward,
    handleRecallOrder
  } = useKDSRealtime({
    initialOrders,
    storeId,
    prepZone,
    soundTone
  })

  // Hydrater les préférences depuis le localStorage au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('kds_theme')
      if (savedTheme) setIsDarkMode(savedTheme === 'dark')

      const savedWarn = localStorage.getItem('kds_warn_threshold')
      if (savedWarn) setWarningThreshold(parseInt(savedWarn))

      const savedCrit = localStorage.getItem('kds_crit_threshold')
      if (savedCrit) setCriticalThreshold(parseInt(savedCrit))

      const savedTone = localStorage.getItem('kds_sound_tone')
      if (savedTone) setSoundTone(savedTone as any)
    }
  }, [])

  // Sauvegarder les préférences lors des changements
  const toggleTheme = () => {
    const nextVal = !isDarkMode
    setIsDarkMode(nextVal)
    localStorage.setItem('kds_theme', nextVal ? 'dark' : 'light')
  }

  const handleSaveSettings = (warn: number, crit: number, tone: 'info' | 'success' | 'warning') => {
    setWarningThreshold(warn)
    setCriticalThreshold(crit)
    setSoundTone(tone)
    localStorage.setItem('kds_warn_threshold', warn.toString())
    localStorage.setItem('kds_crit_threshold', crit.toString())
    localStorage.setItem('kds_sound_tone', tone)
    setShowSettings(false)

    // Jouer le son test
    playNotificationSound(tone)
  }

  const pushKitchenAlert = (alert: KitchenAlert) => {
    // Les alertes sont maintenant gérées ou poussées si besoin
  }

  const toggleItemCompletion = (itemId: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  useEffect(() => {
    const refreshClock = () => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR'))
    }

    refreshClock()
    const interval = setInterval(refreshClock, 1000)
    return () => clearInterval(interval)
  }, [])

  const streamLabel = streamStatus === 'connected'
    ? 'Flux connecté'
    : streamStatus === 'connecting'
      ? 'Connexion flux'
      : `Reconnexion ${Math.ceil(retryDelay / 1000)}s`

  const handleLogout = async () => {
    setIsSidebarOpen(false)
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()
  }

  const processedOrders = orders.filter(order => !order.servedAt).map(order => {
    const filteredItems = order.items.filter(item => {
      if (prepZone === 'ALL') return true
      const isDrink = item.product.category?.name.toLowerCase().includes('boisson') || false
      return prepZone === 'CUISINE' ? !isDrink : isDrink
    })
    return { ...order, items: filteredItems }
  }).filter(order => order.items.length > 0)

  const pendingOrders = processedOrders.filter(o => o.status === 'EN_ATTENTE')
  const preparingOrders = processedOrders.filter(o => o.status === 'PREPARATION')
  const readyOrders = processedOrders.filter(o => o.status === 'PRET')

  // Classes de styles dynamiques basées sur Dark Mode
  const bgThemeClass = isDarkMode ? 'bg-[#0f1115] text-[#eceff4]' : 'bg-[#f8f9fa] text-[#212529]'
  const asideThemeClass = isDarkMode ? 'bg-[#181a20] border-[#2e3440]' : 'bg-white border-[#dee2e6]'
  const headerThemeClass = isDarkMode ? 'bg-[#181a20] border-[#2e3440] text-white' : 'bg-white border-[#dee2e6]'
  const textMutedThemeClass = isDarkMode ? 'text-[#8c96a5]' : 'text-[#adb5bd]'
  const btnActiveThemeClass = isDarkMode ? 'bg-[#2b303c] text-amber-400 shadow-md border border-amber-400/20' : 'bg-[#212529] text-white shadow-lg'

  return (
    <div className={`flex min-h-screen font-sans overflow-hidden xl:h-screen transition-all ${bgThemeClass}`}>
      {/* Overlay Sidebar mobile */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f1115]/55 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar de navigation KDS */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[16rem] max-w-[84vw] flex-col gap-8 border-r px-4 py-6 shadow-sm transition-transform duration-300 lg:static lg:w-20 lg:max-w-none lg:translate-x-0 lg:items-center lg:px-0 lg:py-8 transition-colors ${asideThemeClass} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
          {/* Mode Sombre / Clair Direct Toggle (Loyverse Requirement) */}
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

      {/* Zone de contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className={`border-b px-4 py-4 z-10 shadow-sm md:px-6 lg:px-10 transition-colors ${headerThemeClass}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-start gap-4 xl:items-center xl:gap-6">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all lg:hidden ${isDarkMode ? 'border-[#2e3440] bg-[#1e222b]' : 'border-[#dee2e6] bg-[#f8f9fa]'
                  }`}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter">Écran Cuisine KDS</h1>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${textMutedThemeClass}`}>{storeName}</p>
              </div>

              {/* Sélecteur de zone (Tout / Cuisine / Bar) */}
              <div className={`flex overflow-x-auto p-1 rounded-xl border no-scrollbar transition-all ${isDarkMode ? 'bg-[#12141c] border-[#2e3440]' : 'bg-[#f1f3f5] border-[#e9ecef]'
                }`}>
                <button
                  onClick={() => setPrepZone('ALL')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${prepZone === 'ALL'
                      ? btnActiveThemeClass
                      : `${isDarkMode ? 'text-[#8c96a5] hover:text-white' : 'text-[#adb5bd] hover:text-[#212529]'}`
                    }`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setPrepZone('CUISINE')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${prepZone === 'CUISINE'
                      ? btnActiveThemeClass
                      : `${isDarkMode ? 'text-[#8c96a5] hover:text-white' : 'text-[#adb5bd] hover:text-[#212529]'}`
                    }`}
                >
                  Cuisine
                </button>
                <button
                  onClick={() => setPrepZone('BAR')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${prepZone === 'BAR'
                      ? btnActiveThemeClass
                      : `${isDarkMode ? 'text-[#8c96a5] hover:text-white' : 'text-[#adb5bd] hover:text-[#212529]'}`
                    }`}
                >
                  Bar
                </button>
              </div>

              <div className={`hidden h-8 w-px bg-current opacity-10 xl:block`} />

              <div className="flex flex-wrap items-center gap-4">
                <StatusCounter label="À PRÉPARER" count={pendingOrders.length} color="bg-[#e03131]" isDarkMode={isDarkMode} />
                <StatusCounter label="EN COURS" count={preparingOrders.length} color="bg-[#f08c00]" isDarkMode={isDarkMode} />
                <StatusCounter label="PRÊT" count={readyOrders.length} color="bg-[#2f9e44]" isDarkMode={isDarkMode} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 xl:justify-end">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${streamStatus === 'connected'
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

        {/* Bandeau Alertes Appels Serveur */}
        {serverCalls.length > 0 && (
          <div className="border-b border-[#ffd43b] bg-[#fff9db] px-4 py-3 md:px-6 lg:px-10">
            <div className="flex flex-wrap items-center gap-3">
              {serverCalls.map(call => (
                <div key={`${call.tableId}-${call.timestamp}`} className="flex items-center gap-3 rounded-xl border border-[#fcc419] bg-white px-4 py-2 text-[#f08c00] shadow-sm">
                  <BellRing className="h-4 w-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Appel serveur {call.tableNumber ? `Table ${call.tableNumber}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServerCalls(prev => prev.filter(item => item.tableId !== call.tableId))}
                    className="rounded-lg p-1 text-[#adb5bd] hover:bg-[#f1f3f5]"
                    aria-label="Masquer l'appel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bandeau Alertes Générales Cuisine */}
        {kitchenAlerts.length > 0 && (
          <div className={`border-b px-4 py-3 md:px-6 lg:px-10 transition-colors ${isDarkMode ? 'bg-[#12141c] border-[#2e3440]' : 'bg-white border-[#dee2e6]'}`}>
            <div className="flex flex-wrap items-center gap-3">
              {kitchenAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-2 shadow-sm transition-all ${alert.tone === 'success'
                      ? 'border-[#b2f2bb] bg-[#ebfbee] text-[#2f9e44]'
                      : alert.tone === 'warning'
                        ? 'border-[#ffd43b] bg-[#fff9db] text-[#f08c00]'
                        : 'border-[#a5d8ff] bg-[#e7f5ff] text-[#1971c2]'
                    }`}
                >
                  <BellRing className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{alert.message}</span>
                  <button
                    type="button"
                    onClick={() => setKitchenAlerts(prev => prev.filter(item => item.id !== alert.id))}
                    className="rounded-lg p-1 text-current/60 hover:bg-white/60"
                    aria-label="Masquer l'alerte"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zone des colonnes KDS */}
        <div className={`flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8 flex gap-6 lg:gap-8 transition-colors ${isDarkMode ? 'bg-[#12141c]' : 'bg-[#f1f3f5]'
          }`}>
          <KDSColumn
            title="Nouvelles Commandes"
            color="#e03131"
            orders={pendingOrders}
            onAction={handleUpdateStatus}
            icon={<Play className="w-5 h-5" />}
            actionLabel="COMMENCER"
            isDarkMode={isDarkMode}
            completedItems={completedItems}
            toggleItemCompletion={toggleItemCompletion}
            warningThreshold={warningThreshold}
            criticalThreshold={criticalThreshold}
          />
          <KDSColumn
            title="En Préparation"
            color="#f08c00"
            orders={preparingOrders}
            onAction={handleUpdateStatus}
            onBackAction={handleMoveStatusBackward}
            icon={<Check className="w-5 h-5" />}
            actionLabel="TERMINER"
            isDarkMode={isDarkMode}
            completedItems={completedItems}
            toggleItemCompletion={toggleItemCompletion}
            warningThreshold={warningThreshold}
            criticalThreshold={criticalThreshold}
          />
          <KDSColumn
            title="Prêt / À Servir"
            color="#2f9e44"
            orders={readyOrders}
            onBackAction={handleMoveStatusBackward}
            isDarkMode={isDarkMode}
            completedItems={completedItems}
            toggleItemCompletion={toggleItemCompletion}
            warningThreshold={warningThreshold}
            criticalThreshold={criticalThreshold}
          />
        </div>
      </main>

      {/* Modal Réglages KDS (Loyverse Style settings) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <SettingsPanel
            currentWarn={warningThreshold}
            currentCrit={criticalThreshold}
            currentTone={soundTone}
            isDarkMode={isDarkMode}
            onClose={() => setShowSettings(false)}
            onSave={handleSaveSettings}
          />
        </div>
      )}

      {/* Sidebar Coulissante Rappel des Tickets Terminés */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0f1115]/75 backdrop-blur-xs animate-in fade-in duration-300">
          <button
            onClick={() => setShowHistory(false)}
            className="flex-1 cursor-default focus:outline-none"
            aria-label="Fermer"
          />
          <div className={`w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 transition-colors ${isDarkMode ? 'bg-[#181a20] text-white border-l border-[#2e3440]' : 'bg-white text-[#212529] border-l border-[#dee2e6]'
            }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-[#2e3440]' : 'border-[#dee2e6]'
              }`}>
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black uppercase tracking-tight">Rappel de Tickets</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-[#2b303c] text-white' : 'hover:bg-[#f1f3f5] text-gray-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {completedHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#adb5bd]">
                  <ClipboardCheck className="w-16 h-16 mb-4 opacity-25" />
                  <p className="text-xs font-black uppercase tracking-widest">Aucun ticket archivé</p>
                  <p className="text-[10px] text-center mt-1">Les tickets terminés s'afficheront ici pour rappel.</p>
                </div>
              ) : (
                completedHistory.map(order => (
                  <div
                    key={order.id}
                    className={`rounded-xl border p-4 shadow-xs flex flex-col gap-3 transition-all ${isDarkMode ? 'bg-[#1e222b] border-[#2e3440]' : 'bg-[#f8f9fa] border-[#dee2e6]'
                      }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-current/10">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white bg-green-600`}>
                          #{order.id.slice(-4).toUpperCase()}
                        </span>
                        {order.table && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isDarkMode ? 'bg-amber-400/10 text-amber-400' : 'bg-[#FF6D00]/10 text-[#FF6D00]'
                            }`}>
                            Table {order.table.number}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 font-mono">
                        {new Date(order.createdAt).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            <span className="font-bold mr-2 text-green-500">{item.quantity}x</span>
                            {item.product.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleRecallOrder(order)}
                      className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Rappeler le Ticket
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


