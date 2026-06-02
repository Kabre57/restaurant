// src/components/ui/Badge.tsx
import React from 'react'

export type BadgeStatus = 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELLED' | 'PREPARING' | 'READY' | 'CASHIER' | 'RESTAURATEUR' | 'SERVER' | 'ADMIN'

export interface BadgeProps {
  status: BadgeStatus | string
  label?: string
  className?: string
}

export function Badge({ status, label, className = '' }: BadgeProps) {
  const normStatus = status.toUpperCase()

  // High contrast and cohesive coloring depending on badge status
  const styles: Record<string, string> = {
    PENDING: 'bg-[var(--ui-warning-light)] text-[var(--ui-warning)] border border-amber-200/50 dark:border-amber-900/30',
    PREPARING: 'bg-[var(--ui-info-light)] text-[var(--ui-info)] border border-blue-200/50 dark:border-blue-900/30',
    READY: 'bg-[var(--ui-success-light)] text-[var(--ui-success)] border border-green-200/50 dark:border-green-900/30',
    PAID: 'bg-[var(--ui-success-light)] text-[var(--ui-success)] border border-green-200/50 dark:border-green-900/30',
    DELIVERED: 'bg-[var(--ui-success-light)] text-[var(--ui-success)] border border-green-200/50 dark:border-green-900/30',
    CANCELLED: 'bg-[var(--ui-danger-light)] text-[var(--ui-danger)] border border-red-200/50 dark:border-red-900/30',
    
    // Roles
    ADMIN: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/30',
    RESTAURATEUR: 'bg-[var(--ui-primary-light)] text-[var(--ui-primary)] border border-orange-200 dark:border-orange-900/30',
    SERVER: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/30',
    CASHIER: 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/30',
  }

  const activeStyle = styles[normStatus] || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700/50'

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-black tracking-wider uppercase rounded-full select-none ${activeStyle} ${className}`}>
      {label || status}
    </span>
  )
}
