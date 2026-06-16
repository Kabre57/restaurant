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

  const styles: Record<string, string> = {
    PENDING: 'th-badge--warning',
    PREPARING: 'th-badge--primary',
    READY: 'th-badge--success',
    PAID: 'th-badge--success',
    DELIVERED: 'th-badge--success',
    CANCELLED: 'th-badge--muted',

    ADMIN: 'th-badge--primary',
    RESTAURATEUR: 'th-badge--warning',
    SERVER: 'th-badge--success',
    CASHIER: 'th-badge--primary',
  }

  const activeStyle = styles[normStatus] || 'th-badge--muted'
  const displayLabel = label ?? status
  const textValue = displayLabel
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase())

  return (
    <span className={`th-badge ${activeStyle} select-none ${className}`}>
      {textValue}
    </span>
  )
}
