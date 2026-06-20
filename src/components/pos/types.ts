'use client'

import type { Reservation, Table } from '@prisma/client'
import type { CachedCategory, CachedProduct } from '@/lib/idb'
import type { ActiveShift } from './hooks/usePOSShift'
import type { OrderFlowMode, POSViewMode } from './lib/pos-helpers'

export type LiveOrder = {
  id: string
  tableId?: string | null
  status: string
  total?: number
  servedAt?: Date | string | null
  table?: {
    number: number
  } | null
  items: {
    id: string
    quantity: number
    options?: string | null
    product: {
      name: string
    }
  }[]
}

export type POSAlertState = {
  title: string
  message: string
  type?: 'error' | 'success' | 'info'
} | null

export interface POSClientProps {
  categories: CachedCategory[]
  products: CachedProduct[]
  tables: Table[]
  reservations: Reservation[]
  activeOrders?: LiveOrder[]
  storeId: string
  cashierId: string
  operatorRole?: 'CASHIER' | 'SERVER'
  flowModeLocked?: boolean
  initialFlowMode?: OrderFlowMode
  initialViewMode?: POSViewMode
  initialActiveShift?: ActiveShift | null
  displayVatBreakdown?: boolean
}
