'use client'

import { useState } from 'react'
import { openShift, closeShift } from '@/app/actions/caisse/cashDrawer'

export type ActiveShift = {
  id: string
  startAmount: number
  openedByName: string
  openedAt: Date | string
}

interface UsePOSShiftOptions {
  storeId: string
  cashierId: string
  userName: string
  initialActiveShift: ActiveShift | null
}

export function usePOSShift({
  storeId,
  cashierId,
  userName,
  initialActiveShift
}: UsePOSShiftOptions) {
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(initialActiveShift)
  const [shiftStartInput, setShiftStartInput] = useState('')
  const [shiftLoading, setShiftLoading] = useState(false)
  const [shiftError, setShiftError] = useState<string | null>(null)

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(shiftStartInput)
    if (isNaN(amount) || amount < 0) {
      setShiftError('Veuillez entrer un montant valide.')
      return
    }
    setShiftLoading(true)
    setShiftError(null)
    const res = await openShift(storeId, cashierId, userName || 'Caissier', amount)
    setShiftLoading(false)
    if (res.success && res.shift) {
      setActiveShift(res.shift as unknown as ActiveShift)
      setShiftStartInput('')
    } else {
      setShiftError(res.error || "Erreur lors de l'ouverture.")
    }
  }

  const handleCloseShift = async (endAmount: number) => {
    if (!activeShift) return
    const res = await closeShift(activeShift.id, cashierId, userName || 'Caissier', endAmount)
    if (res.success) {
      setActiveShift(null)
    }
    return res
  }

  return {
    activeShift,
    shiftStartInput,
    setShiftStartInput,
    shiftLoading,
    shiftError,
    handleOpenShift,
    handleCloseShift
  }
}
