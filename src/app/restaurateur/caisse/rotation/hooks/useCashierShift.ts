'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getActiveShift,
  openShift,
  getShiftHistory
} from '@/app/actions/caisse/cashDrawer'
import type { CashDrawerShift } from '../types'

interface UseCashierShiftOptions {
  storeId?: string
  userId: string
  userName: string
}

export function useCashierShift({ storeId, userId, userName }: UseCashierShiftOptions) {
  const [isLoading, setIsLoading] = useState(true)
  const [activeShift, setActiveShift] = useState<CashDrawerShift | null>(null)
  const [totalCashSales, setTotalCashSales] = useState(0)
  const [expectedAmount, setExpectedAmount] = useState(0)
  const [history, setHistory] = useState<CashDrawerShift[]>([])

  // Modal / Inputs state
  const [startAmountInput, setStartAmountInput] = useState('')
  const [isPayInOutOpen, setIsPayInOutOpen] = useState(false)
  const [payInOutType, setPayInOutType] = useState<'PAY_IN' | 'PAY_OUT'>('PAY_IN')
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Helper alert notifications
  const triggerSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg)
    const timeout = setTimeout(() => setSuccessMsg(null), 4000)
    return () => clearTimeout(timeout)
  }, [])

  const triggerError = useCallback((msg: string) => {
    setErrorMsg(msg)
    const timeout = setTimeout(() => setErrorMsg(null), 4000)
    return () => clearTimeout(timeout)
  }, [])

  const loadData = useCallback(async () => {
    if (!storeId) return
    setIsLoading(true)

    try {
      const activeRes = await getActiveShift(storeId)
      if (activeRes.success && activeRes.shift) {
        setActiveShift(activeRes.shift as unknown as CashDrawerShift)
        setTotalCashSales(activeRes.totalCashSales || 0)
        setExpectedAmount(activeRes.expectedAmount || 0)
      } else {
        setActiveShift(null)
        setTotalCashSales(0)
        setExpectedAmount(0)
      }

      const historyRes = await getShiftHistory(storeId)
      if (historyRes.success && historyRes.history) {
        setHistory(historyRes.history as unknown as CashDrawerShift[])
      }
    } catch (error) {
      triggerError("Impossible de charger les données de caisse.")
    } finally {
      setIsLoading(false)
    }
  }, [storeId, triggerError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId || !startAmountInput) return

    const amount = parseFloat(startAmountInput)
    if (isNaN(amount) || amount < 0) {
      triggerError('Veuillez entrer un montant valide.')
      return
    }

    try {
      const res = await openShift(storeId, userId, userName, amount)
      if (res.success) {
        triggerSuccess('Caisse ouverte avec succès ! Bon service.')
        setStartAmountInput('')
        void loadData()
      } else {
        triggerError(res.error || "Erreur lors de l'ouverture.")
      }
    } catch {
      triggerError("Erreur réseau lors de l'ouverture de la caisse.")
    }
  }

  const exportToCSV = () => {
    if (history.length === 0) {
      triggerError('Aucun shift dans l\'historique à exporter.')
      return
    }

    const headers = [
      'Date Ouverture',
      'Date Clôture',
      'Caissier',
      'Fond Initial (FCFA)',
      'Réel Clôture (FCFA)',
      'Attendu (FCFA)',
      'Écart (FCFA)',
      'Statut'
    ]

    const rows = history.map(s => {
      const openedAt = new Date(s.openedAt).toLocaleString('fr-FR').replace(/"/g, '""')
      const closedAt = s.closedAt ? new Date(s.closedAt).toLocaleString('fr-FR').replace(/"/g, '""') : '—'
      const ecart = s.endAmount !== null && s.expectedAmount !== null ? s.endAmount - s.expectedAmount : 0
      return [
        `"${openedAt}"`,
        `"${closedAt}"`,
        `"${s.openedByName.replace(/"/g, '""')}"`,
        s.startAmount,
        s.endAmount !== null ? s.endAmount : '—',
        s.expectedAmount !== null ? s.expectedAmount : '—',
        ecart,
        s.status === 'CLOSED' ? 'Cloture' : 'Ouvert'
      ]
    })

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `historique_shifts_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    triggerSuccess('Historique exporté au format CSV.')
  }

  return {
    isLoading,
    activeShift,
    totalCashSales,
    expectedAmount,
    history,
    startAmountInput,
    setStartAmountInput,
    isPayInOutOpen,
    setIsPayInOutOpen,
    payInOutType,
    setPayInOutType,
    isCloseShiftOpen,
    setIsCloseShiftOpen,
    errorMsg,
    successMsg,
    triggerSuccess,
    triggerError,
    loadData,
    handleOpenShift,
    exportToCSV
  }
}
