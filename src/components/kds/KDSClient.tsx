'use client'

import React, { useState } from 'react'
import { Check, Play, RotateCcw, X, BellRing } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

import { KDSColumn } from './KDSColumn'
import SettingsPanel from './SettingsPanel'
import { useKDSRealtime } from './hooks/useKDSRealtime'
import { useKDSSettings } from './hooks/useKDSSettings'
import { KDSSidebar } from './components/KDSSidebar'
import { KDSHeader } from './components/KDSHeader'
import { HistorySidebar } from './components/HistorySidebar'
import type { KDSOrder } from './types'
export type { KDSOrder, OrderStatus, Order } from './types'

export default function KDSClient({
  initialOrders,
  storeId,
  storeName
}: {
  initialOrders: KDSOrder[]
  storeId: string
  storeName: string
}) {
  const router = useRouter()
  const [prepZone, setPrepZone] = useState<'ALL' | 'CUISINE' | 'BAR'>('ALL')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})

  // Custom Settings & Theme & Local Clock Hook
  const {
    currentTime,
    isDarkMode,
    toggleTheme,
    warningThreshold,
    criticalThreshold,
    soundTone,
    handleSaveSettings
  } = useKDSSettings()

  // SSE Stream Management & Offline Synchronization Hook
  const {
    orders,
    streamStatus,
    retryDelay,
    serverCalls,
    setServerCalls,
    kitchenAlerts,
    setKitchenAlerts,
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

  const toggleItemCompletion = (itemId: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

<<<<<<< HEAD
  // Suivi des alertes sonores de retard déjà jouées pour éviter les signaux répétés en boucle
  const triggeredAlertsRef = useRef<{ warning: Set<string>; critical: Set<string> }>({
    warning: new Set(),
    critical: new Set()
  })

  useEffect(() => {
    const checkDelayedOrders = () => {
      const activeTickets = orders.filter(o => o.status === 'EN_ATTENTE' || o.status === 'PREPARATION')
      let shouldPlayAlert = false

      activeTickets.forEach(order => {
        const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)

        // Alerte critique
        if (elapsedMinutes >= criticalThreshold) {
          if (!triggeredAlertsRef.current.critical.has(order.id)) {
            triggeredAlertsRef.current.critical.add(order.id)
            triggeredAlertsRef.current.warning.add(order.id)
            shouldPlayAlert = true
          }
        }
        // Alerte avertissement (warning)
        else if (elapsedMinutes >= warningThreshold) {
          if (!triggeredAlertsRef.current.warning.has(order.id)) {
            triggeredAlertsRef.current.warning.add(order.id)
            shouldPlayAlert = true
          }
        }
      })

      if (shouldPlayAlert) {
        playNotificationSound('warning')
      }

      // Nettoyage des commandes terminées, annulées ou prêtes
      const activeIds = new Set(activeTickets.map(o => o.id))
      triggeredAlertsRef.current.warning.forEach(id => {
        if (!activeIds.has(id)) triggeredAlertsRef.current.warning.delete(id)
      })
      triggeredAlertsRef.current.critical.forEach(id => {
        if (!activeIds.has(id)) triggeredAlertsRef.current.critical.delete(id)
      })
    }

    const interval = setInterval(checkDelayedOrders, 5000)
    return () => clearInterval(interval)
  }, [orders, warningThreshold, criticalThreshold])

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

=======
>>>>>>> bbaf5ff (Refactorisation)
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

  const bgThemeClass = isDarkMode ? 'bg-[#0f1115] text-[#eceff4]' : 'bg-[#f8f9fa] text-[#212529]'

  return (
    <div className={`flex min-h-screen font-sans overflow-hidden xl:h-screen transition-all ${bgThemeClass}`}>
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f1115]/55 backdrop-blur-sm lg:hidden"
        />
      )}

      <KDSSidebar
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        setShowHistory={setShowHistory}
        setShowSettings={setShowSettings}
        handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <KDSHeader
          isDarkMode={isDarkMode}
          setIsSidebarOpen={setIsSidebarOpen}
          storeName={storeName}
          prepZone={prepZone}
          setPrepZone={setPrepZone}
          pendingOrdersCount={pendingOrders.length}
          preparingOrdersCount={preparingOrders.length}
          readyOrdersCount={readyOrders.length}
          streamStatus={streamStatus}
          retryDelay={retryDelay}
          currentTime={currentTime}
        />

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

        <div className={`flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8 flex gap-6 lg:gap-8 transition-colors ${
          isDarkMode ? 'bg-[#12141c]' : 'bg-[#f1f3f5]'
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

      {showHistory && (
        <HistorySidebar
          isDarkMode={isDarkMode}
          setShowHistory={setShowHistory}
          completedHistory={completedHistory}
          handleRecallOrder={handleRecallOrder}
        />
      )}
    </div>
  )
}
