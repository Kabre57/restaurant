'use client'

import { useState } from 'react'
import { searchCustomer } from '@/app/actions/clients/loyalty'
import type { PaymentCustomer } from './usePOSCheckout.helpers'

export function useCustomerSelection() {
  const [selectedCustomer, setSelectedCustomer] = useState<PaymentCustomer | null>(null)
  const [customerResults, setCustomerResults] = useState<PaymentCustomer[]>([])

  const handleCustomerSearch = async (query: string, isSettlementFlow: boolean) => {
    if (query.length < 3 || isSettlementFlow) {
      setCustomerResults([])
      return
    }

    const results = await searchCustomer(query)
    setCustomerResults(results as PaymentCustomer[])
  }

  const resetCustomerSelection = () => {
    setSelectedCustomer(null)
    setCustomerResults([])
  }

  return {
    selectedCustomer,
    setSelectedCustomer,
    customerResults,
    setCustomerResults,
    handleCustomerSearch,
    resetCustomerSelection
  }
}
