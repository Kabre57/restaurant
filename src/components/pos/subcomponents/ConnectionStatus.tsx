'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

type ConnectionStatusProps = {
  isOnline: boolean
  isSyncing: boolean
  queueCount: number
  onSyncNow?: () => void
}

/**
 * Composant affichant le statut de connexion au serveur (En ligne / Hors ligne)
 * et le nombre de commandes en attente de synchronisation.
 */
export function ConnectionStatus({ isOnline: propIsOnline, isSyncing, queueCount, onSyncNow }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(propIsOnline)

  // Synchronise le statut avec les changements du parent
  useEffect(() => {
    setIsOnline(propIsOnline)
  }, [propIsOnline])

  // Ajoute des écouteurs d'événements physiques pour forcer la mise à jour immédiate
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Vérification initiale forcée
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const hasPendingOrders = queueCount > 0
  const label = isOnline ? 'En ligne' : 'Hors ligne'
  const detail = hasPendingOrders
    ? isSyncing ? 'Synchronisation...' : `${queueCount} en attente`
    : 'File vide'

  return (
    <button
      type="button"
      onClick={isOnline && hasPendingOrders && !isSyncing ? onSyncNow : undefined}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
        isOnline
          ? 'border-[#b2f2bb] bg-[#ebfbee] text-[#2f9e44]'
          : 'border-[#ffc9c9] bg-[#fff5f5] text-[#e03131]'
      } ${isOnline && hasPendingOrders && !isSyncing ? 'hover:brightness-95 active:scale-95' : 'cursor-default'}`}
      title={isOnline && hasPendingOrders ? 'Synchroniser maintenant' : undefined}
    >
      {isSyncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : isOnline ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
      <span className="text-[#868e96]">{detail}</span>
    </button>
  )
}
