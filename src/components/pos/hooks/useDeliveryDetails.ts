'use client'

import { useState } from 'react'

export function useDeliveryDetails() {
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryClientName, setDeliveryClientName] = useState('')
  const [deliveryClientPhone, setDeliveryClientPhone] = useState('')
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null)
  const [deliveryDurationMins, setDeliveryDurationMins] = useState<number | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)

  const handleAddressSelect = (address: string) => {
    setDeliveryAddress(address)
    const distance = 2 + (address.length % 5) + Math.random() * 2
    const duration = Math.round(distance * 3 + 5)
    const fee = Math.round(500 + distance * 250)
    setDeliveryDistanceKm(distance)
    setDeliveryDurationMins(duration)
    setDeliveryFee(fee)
  }

  const resetDeliveryDetails = () => {
    setOrderType('DINE_IN')
    setDeliveryAddress('')
    setDeliveryClientName('')
    setDeliveryClientPhone('')
    setDeliveryDistanceKm(null)
    setDeliveryDurationMins(null)
    setDeliveryFee(0)
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
    handleAddressSelect,
    resetDeliveryDetails
  }
}
