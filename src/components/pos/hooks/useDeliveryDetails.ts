'use client'

import { useRef, useState } from 'react'

export function useDeliveryDetails(storeId: string) {
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryClientName, setDeliveryClientName] = useState('')
  const [deliveryClientPhone, setDeliveryClientPhone] = useState('')
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null)
  const [deliveryDurationMins, setDeliveryDurationMins] = useState<number | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [isFetchingQuote, setIsFetchingQuote] = useState(false)
  const [deliveryQuoteError, setDeliveryQuoteError] = useState<string | null>(null)
  const quoteRequestId = useRef(0)

  const handleAddressSelect = async (address: string) => {
    setDeliveryAddress(address)
    setDeliveryQuoteError(null)

    if (!storeId || address.trim().length < 5) {
      setDeliveryDistanceKm(null)
      setDeliveryDurationMins(null)
      setDeliveryFee(0)
      return
    }

    const requestId = ++quoteRequestId.current
    setIsFetchingQuote(true)

    try {
      const response = await fetch(
        `/api/delivery/estimate?storeId=${encodeURIComponent(storeId)}&address=${encodeURIComponent(address)}`
      )
      const data = (await response.json()) as {
        error?: string
        distanceKm?: number
        estimatedTimeMinutes?: number
        deliveryFee?: number
      }

      if (requestId !== quoteRequestId.current) {
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "Impossible de calculer le devis de livraison")
      }

      setDeliveryDistanceKm(typeof data.distanceKm === 'number' ? data.distanceKm : null)
      setDeliveryDurationMins(typeof data.estimatedTimeMinutes === 'number' ? data.estimatedTimeMinutes : null)
      setDeliveryFee(typeof data.deliveryFee === 'number' ? data.deliveryFee : 0)
    } catch (error) {
      if (requestId !== quoteRequestId.current) {
        return
      }

      setDeliveryDistanceKm(null)
      setDeliveryDurationMins(null)
      setDeliveryFee(0)
      setDeliveryQuoteError(error instanceof Error ? error.message : "Impossible de calculer le devis de livraison")
    } finally {
      if (requestId === quoteRequestId.current) {
        setIsFetchingQuote(false)
      }
    }
  }

  const resetDeliveryDetails = () => {
    quoteRequestId.current += 1
    setOrderType('DINE_IN')
    setDeliveryAddress('')
    setDeliveryClientName('')
    setDeliveryClientPhone('')
    setDeliveryDistanceKm(null)
    setDeliveryDurationMins(null)
    setDeliveryFee(0)
    setDeliveryQuoteError(null)
    setIsFetchingQuote(false)
  }

  return {
    orderType,
    setOrderType,
    deliveryAddress,
    setDeliveryAddress,
    deliveryClientName,
    setDeliveryClientName,
    deliveryClientPhone,
    setDeliveryClientPhone,
    deliveryDistanceKm,
    setDeliveryDistanceKm,
    deliveryDurationMins,
    setDeliveryDurationMins,
    deliveryFee,
    setDeliveryFee,
    isFetchingQuote,
    deliveryQuoteError,
    handleAddressSelect,
    resetDeliveryDetails
  }
}
