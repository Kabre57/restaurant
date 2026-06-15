'use client'

import { useState } from 'react'
import { getRoundedTotal } from '@/app/actions/store/storeSettings'

interface UsePaymentCalculatorOptions {
  storeId: string
  grossTotal: number
  totalDiscount: number
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  deliveryFee: number
  isSettlementFlow: boolean
  paymentContext: { kind: 'NEW_ORDER' | 'SETTLEMENT'; order?: any }
}

function createBillSelectionId(value: number) {
  return `${value}-${Date.now()}-${Math.random()}`
}

export function usePaymentCalculator({
  storeId,
  grossTotal,
  totalDiscount,
  orderType,
  deliveryFee,
  isSettlementFlow,
  paymentContext
}: UsePaymentCalculatorOptions) {
  const [amountReceived, setAmountReceived] = useState('')
  const [changeAmount, setChangeAmount] = useState<number | null>(null)
  const [selectedBills, setSelectedBills] = useState<{ id: string; value: number }[]>([])
  const [roundedTotal, setRoundedTotal] = useState<number | null>(null)
  const [roundingDiff, setRoundingDiff] = useState(0)

  const newOrderNetTotal = Math.max(0, grossTotal - totalDiscount)
  const deliveryExtra = orderType === 'DELIVERY' ? deliveryFee : 0
  const paymentTotal = (isSettlementFlow
    ? Number(paymentContext.order?.total || 0)
    : newOrderNetTotal) + deliveryExtra

  const calculateChange = (value: string, effectiveTotal: number) => {
    setAmountReceived(value)
    if (value === '') {
      setChangeAmount(null)
      return
    }
    const received = parseFloat(value)
    setChangeAmount(received - effectiveTotal)
  }

  const handleAddBill = (value: number, effectiveTotal: number) => {
    const newBill = {
      id: createBillSelectionId(value),
      value
    }
    const newBills = [...selectedBills, newBill]
    setSelectedBills(newBills)
    const totalFromBills = newBills.reduce((sum, b) => sum + b.value, 0)
    calculateChange(totalFromBills.toString(), effectiveTotal)
  }

  const handleRemoveBill = (id: string, effectiveTotal: number) => {
    const updatedBills = selectedBills.filter((bill) => bill.id !== id)
    setSelectedBills(updatedBills)
    const totalFromBills = updatedBills.reduce((sum, b) => sum + b.value, 0)
    if (totalFromBills > 0) {
      calculateChange(totalFromBills.toString(), effectiveTotal)
    } else {
      calculateChange('', effectiveTotal)
    }
  }

  const handleResetBills = () => {
    setSelectedBills([])
    setAmountReceived('')
    setChangeAmount(null)
  }

  const fetchRoundingInfo = async (netTotal: number) => {
    try {
      const result = await getRoundedTotal(netTotal, storeId)
      if (result.roundingDiff !== 0) {
        setRoundedTotal(result.roundedTotal)
        setRoundingDiff(result.roundingDiff)
      } else {
        setRoundedTotal(null)
        setRoundingDiff(0)
      }
    } catch {
      setRoundedTotal(null)
      setRoundingDiff(0)
    }
  }

  const resetCalculator = () => {
    setAmountReceived('')
    setChangeAmount(null)
    setSelectedBills([])
    setRoundedTotal(null)
    setRoundingDiff(0)
  }

  return {
    amountReceived,
    changeAmount,
    selectedBills,
    roundedTotal,
    roundingDiff,
    paymentTotal,
    newOrderNetTotal,
    calculateChange,
    handleAddBill,
    handleRemoveBill,
    handleResetBills,
    fetchRoundingInfo,
    resetCalculator,
    setRoundedTotal,
    setRoundingDiff
  }
}
