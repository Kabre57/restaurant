// src/components/ui/Toast.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context.toast
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[var(--ui-success)]" />,
    error: <AlertOctagon className="w-5 h-5 text-[var(--ui-danger)]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[var(--ui-warning)]" />,
    info: <Info className="w-5 h-5 text-[var(--ui-info)]" />,
  }

  const borderStyles = {
    success: 'border-l-4 border-l-[var(--ui-success)]',
    error: 'border-l-4 border-l-[var(--ui-danger)]',
    warning: 'border-l-4 border-l-[var(--ui-warning)]',
    info: 'border-l-4 border-l-[var(--ui-info)]',
  }

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-xl ${borderStyles[toast.type]} pointer-events-auto animate-in slide-in-from-bottom duration-300`}
      role="alert"
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-bold text-[var(--ui-text)]">{toast.message}</div>
      <button
        onClick={() => onClose(toast.id)}
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--ui-secondary-light)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors active:scale-90"
        aria-label="Fermer la notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
