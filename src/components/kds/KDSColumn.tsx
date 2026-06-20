'use client'

import React, { useEffect, useState } from 'react'
import { Clock, PackageCheck, ChefHat, MessageSquare, CheckSquare, Square, RotateCcw } from 'lucide-react'

export type OrderStatus = 'EN_ATTENTE' | 'PREPARATION' | 'PRET' | 'COMPLETED' | 'CANCELLED'

export type KDSColumnOrder = {
  id: string
  status: OrderStatus
  createdAt: Date
  estimatedPrepMinutes?: number | null
  actualPrepMinutes?: number | null
  items: Array<{
    id: string
    quantity: number
    options: string | null
    product: { name: string }
  }>
  table?: { number: number } | null
  customerNotes?: string | null
  isValidated?: boolean
  validatedAt?: number
}

function useRemainingSeconds(validatedAt?: number): number {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!validatedAt) return
    const refreshRemaining = () => {
      const diff = Math.floor((validatedAt + 5 * 60 * 1000 - Date.now()) / 1000)
      setRemaining(Math.max(0, diff))
    }

    refreshRemaining()
    const id = setInterval(refreshRemaining, 1000)
    return () => clearInterval(id)
  }, [validatedAt])

  return remaining
}

function ValidatedBadge({ validatedAt, isDarkMode }: { validatedAt?: number; isDarkMode: boolean }) {
  const remaining = useRemainingSeconds(validatedAt)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  
  return (
    <div className={`mt-2 flex w-full flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-black uppercase tracking-widest ${
      isDarkMode 
        ? 'border-amber-800 bg-amber-950/20 text-amber-400' 
        : 'border-amber-200 bg-amber-50 text-amber-600'
    }`}>
      <div className="flex items-center gap-2">
        <span className="animate-pulse">🔔</span>
        <span>Notifié à la caisse</span>
      </div>
      <div className="text-[9px] opacity-75 font-mono">
        Archivage auto dans {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  )
}

function useElapsedSeconds(createdAt: Date): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const refreshElapsed = () => {
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
    }

    refreshElapsed()
    const id = setInterval(refreshElapsed, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  return elapsed
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function StatusCounter({ label, count, color, isDarkMode }: { label: string, count: number, color: string, isDarkMode?: boolean }) {
  // Adaptation esthétique pour le mode sombre
  const bgColors: Record<string, string> = {
    'bg-[#e03131]': isDarkMode ? 'bg-[#e03131]/20 border-[#e03131]/30 text-[#ff8787]' : 'bg-[#e03131]/10 border-[#e03131]/20 text-[#e03131]',
    'bg-[#f08c00]': isDarkMode ? 'bg-[#f08c00]/20 border-[#f08c00]/30 text-[#ffd43b]' : 'bg-[#f08c00]/10 border-[#f08c00]/20 text-[#f08c00]',
    'bg-[#2f9e44]': isDarkMode ? 'bg-[#2f9e44]/20 border-[#2f9e44]/30 text-[#8ce99a]' : 'bg-[#2f9e44]/10 border-[#2f9e44]/20 text-[#2f9e44]',
  }
  const appliedClass = bgColors[color] || (isDarkMode ? 'bg-[#2e3440] border-[#4c566a] text-[#d8dee9]' : 'bg-[#F8F9FA] border-[#E5E7EB] text-[#868e96]')

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border transition-all ${appliedClass}`}>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-lg text-[10px] font-black shadow-sm ${
        isDarkMode ? 'bg-[#1e222b] text-white' : 'bg-white text-[#212529]'
      }`}>
        {count}
      </span>
    </div>
  )
}

export function KDSColumn({
  title,
  color,
  orders,
  onAction,
  icon,
  actionLabel,
  isDarkMode,
  completedItems,
  toggleItemCompletion,
  warningThreshold,
  criticalThreshold,
  onBackAction,
}: {
  title: string
  color: string
  orders: KDSColumnOrder[]
  onAction?: (id: string, status: OrderStatus) => void
  onBackAction?: (id: string, status: OrderStatus) => void
  icon?: React.ReactNode
  actionLabel?: string
  isDarkMode: boolean
  completedItems: Record<string, boolean>
  toggleItemCompletion: (itemId: string) => void
  warningThreshold: number
  criticalThreshold: number
}) {
  return (
    <div className={`flex w-full min-w-[320px] max-w-sm flex-col rounded-2xl shadow-sm border transition-all ${
      isDarkMode 
        ? 'bg-[#181a20] border-[#2e3440]' 
        : 'bg-[#F8F9FA] border-[#E5E7EB]'
    }`}>
      <div className={`flex items-center justify-between border-b p-4 rounded-t-2xl transition-all ${
        isDarkMode 
          ? 'bg-[#1e222b] border-[#2e3440]' 
          : 'bg-white border-[#E5E7EB]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            isDarkMode 
              ? 'bg-amber-500/10 text-amber-400' 
              : 'bg-[#FF6D00]/10 text-[#FF6D00]'
          }`}>
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h2 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-[#212529]'}`}>{title}</h2>
            <p className={`text-[10px] font-medium ${isDarkMode ? 'text-[#8c96a5]' : 'text-[#868e96]'}`}>Tickets actifs</p>
          </div>
        </div>
        <div className={`flex h-6 min-w-[24px] items-center justify-center rounded-lg px-2 text-[10px] font-black border transition-all ${
          isDarkMode 
            ? 'bg-[#13151a] border-[#2e3440] text-[#a3be8c]' 
            : 'bg-[#F8F9FA] border-[#E5E7EB] text-[#868e96]'
        }`}>
          {orders.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className={`mb-3 rounded-2xl p-4 border transition-all ${
              isDarkMode ? 'bg-[#1e222b] border-[#2e3440]' : 'bg-white border-[#E5E7EB]'
            }`}>
              <PackageCheck className="h-6 w-6 text-[#adb5bd]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Aucune commande</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                color={color} 
                onAction={onAction} 
                icon={icon} 
                actionLabel={actionLabel}
                isDarkMode={isDarkMode}
                completedItems={completedItems}
                toggleItemCompletion={toggleItemCompletion}
                warningThreshold={warningThreshold}
                criticalThreshold={criticalThreshold}
                onBackAction={onBackAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  color,
  onAction,
  icon,
  actionLabel,
  isDarkMode,
  completedItems,
  toggleItemCompletion,
  warningThreshold,
  criticalThreshold,
  onBackAction,
}: {
  order: KDSColumnOrder
  color: string
  onAction?: (id: string, status: OrderStatus) => void
  onBackAction?: (id: string, status: OrderStatus) => void
  icon?: React.ReactNode
  actionLabel?: string
  isDarkMode: boolean
  completedItems: Record<string, boolean>
  toggleItemCompletion: (itemId: string) => void
  warningThreshold: number
  criticalThreshold: number
}) {
  const elapsed = useElapsedSeconds(order.createdAt)
  const elapsedMinutes = Math.floor(elapsed / 60)
  
  const isWarning = elapsedMinutes >= warningThreshold
  const isCritical = elapsedMinutes >= criticalThreshold

  // Détermination de la couleur de l'en-tête en fonction du délai d'attente (Loyverse Style)
  let headerBgClass = isDarkMode ? 'bg-[#1e222b]' : 'bg-[#f8f9fa]'
  let headerTextClass = isDarkMode ? 'text-[#eceff4]' : 'text-[#212529]'
  let cardBorderClass = isDarkMode ? 'border-[#2e3440]' : 'border-[#E5E7EB]'

  if (isCritical) {
    headerBgClass = 'bg-[#e03131] animate-pulse duration-1000'
    headerTextClass = 'text-white'
    cardBorderClass = 'border-[#e03131]'
  } else if (isWarning) {
    headerBgClass = 'bg-[#f08c00]'
    headerTextClass = 'text-white'
    cardBorderClass = 'border-[#f08c00]'
  }

  // Calcul du taux d'avancement des articles du ticket
  const totalItems = order.items.length
  const completedCount = order.items.filter(item => completedItems[item.id]).length
  const isAllItemsCompleted = totalItems > 0 && completedCount === totalItems

  return (
    <div className={`group flex flex-col gap-3 rounded-xl border shadow-sm transition-all hover:shadow-md ${cardBorderClass} ${
      isDarkMode ? 'bg-[#1e222b]' : 'bg-white'
    }`}>
      {/* En-tête colorée selon le délai d'attente */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl transition-all ${headerBgClass} ${headerTextClass}`}>
        <div className="flex items-center gap-2">
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${
            isWarning || isCritical 
              ? 'bg-white/20 text-white' 
              : isDarkMode 
                ? 'bg-[#2b303c] text-white' 
                : 'bg-[#212529] text-white'
          }`}>
            #{order.id.slice(-4).toUpperCase()}
          </span>
          {order.table && (
            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${
              isWarning || isCritical 
                ? 'bg-white/20 text-white' 
                : isDarkMode 
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' 
                  : 'bg-[#FF6D00]/10 text-[#FF6D00] border border-[#FF6D00]/20'
            }`}>
              Table {order.table.number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Timer elapsed={elapsed} isWarning={isWarning} isCritical={isCritical} />
          {onBackAction && (order.status === 'PREPARATION' || order.status === 'PRET') && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBackAction(order.id, order.status) }}
              title="Revenir à l'étape précédente"
              className="rounded-lg p-1 opacity-70 hover:opacity-100 hover:bg-white/20 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3">
        {/* Résumé des articles avec toucher interactif */}
        <div className="flex flex-col gap-2.5">
          {order.items.map(item => {
            const isDone = completedItems[item.id]
            return (
              <div 
                key={item.id} 
                onClick={() => toggleItemCompletion(item.id)}
                className={`flex flex-col text-xs cursor-pointer select-none p-1.5 rounded-lg transition-all ${
                  isDone 
                    ? 'opacity-40 bg-green-500/5' 
                    : isDarkMode 
                      ? 'hover:bg-[#2b303c]' 
                      : 'hover:bg-[#f8f9fa]'
                }`}
              >
                <div className="flex justify-between items-center gap-3">
                  <span className={`font-medium flex items-center gap-2 ${
                    isDone 
                      ? 'line-through text-green-500 font-bold' 
                      : isDarkMode 
                        ? 'text-white' 
                        : 'text-[#212529]'
                  }`}>
                    {isDone ? (
                      <CheckSquare className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Square className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-300'}`} />
                    )}
                    <span>
                      <span className={`mr-1.5 font-black ${isDone ? 'text-green-500' : isDarkMode ? 'text-amber-400' : 'text-[#FF6D00]'}`}>
                        {item.quantity}x
                      </span>
                      {item.product.name}
                    </span>
                  </span>
                </div>
                {item.options && (
                  <span className="text-[10px] font-medium text-[#868e96] ml-6 mt-0.5">
                    • {item.options}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Barre de progression des articles terminés */}
        {totalItems > 1 && (
          <div className="pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-[#868e96] mb-1">
              <span>Progression</span>
              <span>{completedCount}/{totalItems}</span>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-[#2b303c]' : 'bg-[#f1f3f5]'}`}>
              <div 
                className="h-full bg-green-500 transition-all duration-300 rounded-full" 
                style={{ width: `${(completedCount / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Notes/Commentaires du ticket */}
        {order.customerNotes && (
          <div className={`flex items-start gap-2 rounded-xl p-2.5 border text-[10px] font-bold ${
            isDarkMode 
              ? 'bg-[#20242f] border-blue-500/20 text-[#a5d8ff]' 
              : 'bg-[#e7f5ff] border-[#a5d8ff] text-[#1971c2]'
          }`}>
            <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="uppercase tracking-widest block text-[8px] opacity-75 mb-0.5">Note client</span>
              <p className="italic">{order.customerNotes}</p>
            </div>
          </div>
        )}

        {/* Bouton d'action ou badge de validation */}
        {order.isValidated ? (
          <ValidatedBadge validatedAt={order.validatedAt} isDarkMode={isDarkMode} />
        ) : onAction && actionLabel ? (
          <button
            onClick={() => onAction(order.id, order.status)}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 shadow-sm ${
              isAllItemsCompleted ? 'bg-green-600 hover:bg-green-700 animate-bounce duration-1000' : ''
            }`}
            style={{ backgroundColor: isAllItemsCompleted ? undefined : color }}
          >
            {icon}
            {actionLabel}
          </button>
        ) : (
          <div className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[10px] font-black uppercase tracking-widest ${
            isDarkMode 
              ? 'border-green-800 bg-green-950/20 text-green-400' 
              : 'border-green-200 bg-green-50 text-green-600'
          }`}>
            <PackageCheck className="h-4 w-4" />
            Prêt / En attente
          </div>
        )}
      </div>
    </div>
  )
}

function Timer({ elapsed, isWarning, isCritical }: { elapsed: number, isWarning: boolean, isCritical: boolean }) {
  let textClass = 'text-white/80'
  if (isCritical || isWarning) {
    textClass = 'text-white font-black'
  }

  return (
    <div className={`flex items-center gap-1 text-[10px] ${textClass}`}>
      <Clock className="h-3.5 w-3.5" />
      <span>{formatTime(elapsed)}</span>
    </div>
  )
}
