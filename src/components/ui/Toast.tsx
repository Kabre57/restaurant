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
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-md flex-col gap-3 px-4 sm:px-0">
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
    success: <CheckCircle className="h-5 w-5 text-[var(--parabellum-success)]" />,
    error: <AlertOctagon className="h-5 w-5 text-[var(--parabellum-danger)]" />,
    warning: <AlertTriangle className="h-5 w-5 text-[var(--parabellum-warning)]" />,
    info: <Info className="h-5 w-5 text-[var(--parabellum-info)]" />,
  }

  const borderStyles = {
    success: 'border-l-4 border-l-[var(--parabellum-success)]',
    error: 'border-l-4 border-l-[var(--parabellum-danger)]',
    warning: 'border-l-4 border-l-[var(--parabellum-warning)]',
    info: 'border-l-4 border-l-[var(--parabellum-info)]',
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-[1rem] border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] p-4 shadow-[0_18px_36px_rgba(18,18,18,0.12)] ${borderStyles[toast.type]} animate-in slide-in-from-bottom duration-200`}
      role="alert"
    >
      <div className="shrink-0 pt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium text-[var(--parabellum-text)]">{toast.message}</div>
      <button
        onClick={() => onClose(toast.id)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-muted)] transition-colors hover:bg-[#fff6ef] hover:text-[var(--parabellum-text)]"
        aria-label="Fermer la notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
