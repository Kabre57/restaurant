'use client'

import { useState } from 'react'
import { validatePromotion } from '@/app/actions/clients/loyalty'
import type { CartItem } from '@/store/useCart'
import type { AlertPayload } from './usePOSCheckout.helpers'

interface UseDiscountOverrideOptions {
  storeId: string
  grossTotal: number
  items: CartItem[]
  isSettlementFlow: boolean
  onAlert: (alert: AlertPayload) => void
}

export function useDiscountOverride({
  storeId,
  grossTotal,
  items,
  isSettlementFlow,
  onAlert
}: UseDiscountOverrideOptions) {
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loyaltyPointsRedeemed, setLoyaltyPointsRedeemed] = useState(0)
  const [appliedPromoId, setAppliedPromoId] = useState<string | null>(null)

  const loyaltyDiscount = loyaltyPointsRedeemed * 10
  const totalDiscount = discount + loyaltyDiscount

  const handleApplyPromo = async () => {
    if (!promoCode || isSettlementFlow) return

    const result = await validatePromotion(promoCode, storeId, grossTotal, items)
    if (result.success) {
      setDiscount(result.discount || 0)
      setAppliedPromoId(result.promoId || null)
      return
    }

    onAlert({
      title: 'Promotion Invalide',
      message: result.error || "Ce code promo n'est pas valide."
    })
    setDiscount(0)
    setAppliedPromoId(null)
  }

  const resetDiscounts = () => {
    setPromoCode('')
    setDiscount(0)
    setLoyaltyPointsRedeemed(0)
    setAppliedPromoId(null)
  }

  return {
    promoCode,
    setPromoCode,
    discount,
    setDiscount,
    loyaltyPointsRedeemed,
    setLoyaltyPointsRedeemed,
    appliedPromoId,
    setAppliedPromoId,
    loyaltyDiscount,
    totalDiscount,
    handleApplyPromo,
    resetDiscounts
  }
}
