'use client'

export interface ShiftOperation {
  id: string
  amount: number
  type: 'PAY_IN' | 'PAY_OUT'
  note: string | null
  createdAt: Date
}

export interface CashDrawerShift {
  id: string
  openedByName: string
  openedAt: Date
  closedByName: string | null
  closedAt: Date | null
  startAmount: number
  endAmount: number | null
  expectedAmount: number | null
  status: 'OPEN' | 'CLOSED'
  operations: ShiftOperation[]
  storeId: string
}
