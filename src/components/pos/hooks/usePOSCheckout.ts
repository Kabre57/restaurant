// src/components/pos/hooks/usePOSCheckout.ts
'use client'

import { useEffect, useState } from 'react'
import type { Table } from '@prisma/client'

import { getPaymentMethods } from '@/app/actions/orders/paymentMethods'
import { savePaymentMethodsToIDB, getPaymentMethodsFromIDB } from '@/lib/idb'
import type { CartItem } from '@/store/useCart'
import type { ReceiptOrder } from '../subcomponents/ReceiptModal'
import type { OrderFlowMode, PaymentMode } from '../lib/pos-helpers'
import type { RealtimeOrder } from './usePOSRealtime'
import type { AlertPayload, PaymentContext } from './usePOSCheckout.helpers'

import { usePaymentCalculator } from './usePaymentCalculator'
import { useDiscountOverride } from './useDiscountOverride'
import { usePOSValidation } from './usePOSValidation'
import { useOfflineCheckout } from './useOfflineCheckout'
import { useDeliveryDetails } from './useDeliveryDetails'
import { useCustomerSelection } from './useCustomerSelection'
import { useCheckoutExecution } from './useCheckoutExecution'

type POSOperatorRole = 'CASHIER' | 'SERVER'
type POSPaymentMethod = { id: string; name: string; type: string; icon: string | null; isDefault: boolean; isActive?: boolean }

const DEFAULT_PAYMENT_METHODS: POSPaymentMethod[] = [
  { id: 'default-cash', name: 'Espèces', type: 'CASH', icon: '💵', isDefault: true },
  { id: 'default-card', name: 'Carte Bancaire', type: 'CARD', icon: '💳', isDefault: false },
  { id: 'default-mobile', name: 'Mobile Money', type: 'MOBILE_MONEY', icon: '📱', isDefault: false },
]

type UsePOSCheckoutOptions = {
  cashierId: string
  storeId: string
  orderId: number
  orderFlowMode: OrderFlowMode
  selectedTable: Table | null
  liveActiveOrders: RealtimeOrder[]
  items: CartItem[]
  isOnline: boolean
  getTotal: () => number
  clearCart: () => void
  refreshSyncQueueCount: () => Promise<unknown>
  updateSessionStats: (amount: number) => void
  advanceOrderId: () => void
  mergeLiveOrder: (order: RealtimeOrder) => void
  onAfterCheckout: () => void
  onRequireTable: () => void
  onRequireTableSelection?: () => void
  onAlert: (alert: AlertPayload) => void
  operatorRole?: POSOperatorRole
  cashierName?: string | null
}

function mergeMissingDefaultPaymentMethods(activeMethods: POSPaymentMethod[], configuredMethods: POSPaymentMethod[]) {
  const existingTypes = new Set(configuredMethods.map((method) => method.type))
  const missingDefaults = DEFAULT_PAYMENT_METHODS.filter((method) => !existingTypes.has(method.type))
  return [...activeMethods, ...missingDefaults]
}

export function usePOSCheckout({
  cashierId,
  storeId,
  orderId,
  orderFlowMode,
  selectedTable,
  liveActiveOrders,
  items,
  isOnline,
  getTotal,
  clearCart,
  refreshSyncQueueCount,
  updateSessionStats,
  advanceOrderId,
  mergeLiveOrder,
  onAfterCheckout,
  onRequireTable,
  onRequireTableSelection,
  onAlert,
  operatorRole = 'CASHIER',
  cashierName,
}: UsePOSCheckoutOptions) {
  const [paymentMethods, setPaymentMethods] = useState<POSPaymentMethod[]>(DEFAULT_PAYMENT_METHODS)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [lastOrder, setLastOrder] = useState<ReceiptOrder | null>(null)
  const [paymentContext, setPaymentContext] = useState<PaymentContext>({ kind: 'NEW_ORDER' })

  const isSettlementFlow = paymentContext.kind === 'SETTLEMENT'

  // Delegated Customer Selection Hook
  const {
    selectedCustomer,
    setSelectedCustomer,
    customerResults,
    handleCustomerSearch,
    resetCustomerSelection
  } = useCustomerSelection()

  // Delegated Delivery Details Hook
  const {
    orderType,
    setOrderType,
    deliveryAddress,
    setDeliveryAddress,
    deliveryClientName,
    setDeliveryClientName,
    deliveryClientPhone,
    setDeliveryClientPhone,
    deliveryDistanceKm,
    deliveryDurationMins,
    deliveryFee,
    isFetchingQuote,
    deliveryQuoteError,
    handleAddressSelect,
    resetDeliveryDetails
  } = useDeliveryDetails(storeId)

  // Delegated Discount Override Hook
  const {
    promoCode,
    setPromoCode,
    discount,
    loyaltyPointsRedeemed,
    setLoyaltyPointsRedeemed,
    appliedPromoId,
    loyaltyDiscount,
    totalDiscount,
    handleApplyPromo,
    resetDiscounts
  } = useDiscountOverride({
    storeId,
    grossTotal: getTotal(),
    items,
    isSettlementFlow,
    onAlert
  })

  // Delegated Payment Calculator Hook
  const {
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
    resetCalculator
  } = usePaymentCalculator({
    storeId,
    grossTotal: getTotal(),
    totalDiscount,
    orderType,
    deliveryFee,
    isSettlementFlow,
    paymentContext
  })

  // Delegated Checkout Validation Hook
  const { validateCheckout } = usePOSValidation()

  // Delegated Offline Checkout Hook
  const { saveOfflineOrder } = useOfflineCheckout({
    refreshSyncQueueCount,
    updateSessionStats
  })

  const closePaymentModal = () => {
    setShowPaymentModal(false)
    setPaymentContext({ kind: 'NEW_ORDER' })
    resetDiscounts()
    resetCalculator()
    resetCustomerSelection()
    resetDeliveryDetails()
  }

  // Delegated Checkout Execution Hook
  const {
    submitServerOrder,
    finalizeSettlement,
    finalizeNewPaidOrder
  } = useCheckoutExecution(
    {
      cashierId,
      storeId,
      orderId,
      isOnline,
      selectedTable,
      liveActiveOrders,
      items,
      paymentMethods,
      amountReceived,
      changeAmount,
      roundedTotal,
      paymentTotal,
      newOrderNetTotal,
      discount,
      loyaltyPointsRedeemed,
      loyaltyDiscount,
      appliedPromoId,
      selectedCustomer,
      selectedBills,
      orderType,
      deliveryAddress,
      deliveryClientName,
      deliveryClientPhone,
      deliveryDistanceKm,
      deliveryDurationMins,
      deliveryFee,
      isSettlementFlow,
      paymentContext,
      cashierName
    },
    {
      clearCart,
      advanceOrderId,
      mergeLiveOrder,
      onAfterCheckout,
      onAlert,
      updateSessionStats,
      setIsProcessing,
      setLastOrder,
      setShowReceipt,
      closePaymentModal,
      saveOfflineOrder: (data, total) => saveOfflineOrder(data, total)
    }
  )

  useEffect(() => {
    if (!storeId) return

    let isCancelled = false

    async function fetchAndCachePaymentMethods() {
      try {
        const res = await getPaymentMethods(storeId)
        if (isCancelled) return

        if (res.success && res.methods) {
          const configuredMethods = res.methods as POSPaymentMethod[]
          const activeMethods = configuredMethods.filter((method) => method.isActive !== false)
          const completedMethods = mergeMissingDefaultPaymentMethods(activeMethods, configuredMethods)
          const finalMethods = completedMethods.length > 0 ? completedMethods : DEFAULT_PAYMENT_METHODS
          
          setPaymentMethods(finalMethods)
          void savePaymentMethodsToIDB(finalMethods.map(m => ({
            id: m.id,
            name: m.name,
            type: m.type,
            icon: m.icon,
            isDefault: m.isDefault,
            isActive: m.isActive !== false,
            displayOrder: 1,
          })))
          return
        }
      } catch (err) {
        console.error("Erreur de récupération en ligne des modes de paiement:", err)
      }

      try {
        const cached = await getPaymentMethodsFromIDB()
        if (isCancelled) return
        if (cached && cached.length > 0) {
          setPaymentMethods(cached as POSPaymentMethod[])
          return
        }
      } catch (err) {
        console.error("Erreur de lecture du cache IndexedDB:", err)
      }

      if (!isCancelled) {
        setPaymentMethods(DEFAULT_PAYMENT_METHODS)
      }
    }

    void fetchAndCachePaymentMethods()

    return () => {
      isCancelled = true
    }
  }, [storeId])

  const openSettlementForOrder = (order: RealtimeOrder) => {
    setPaymentContext({ kind: 'SETTLEMENT', order })
    resetDiscounts()
    resetCalculator()
    resetCustomerSelection()
    resetDeliveryDetails()
    setShowPaymentModal(true)
  }

  const openNewOrderPayment = async () => {
    setPaymentContext({ kind: 'NEW_ORDER' })
    resetDiscounts()
    resetCalculator()
    resetCustomerSelection()
    resetDeliveryDetails()

    await fetchRoundingInfo(newOrderNetTotal)
    setShowPaymentModal(true)
  }

  const handleCheckoutClick = (overrideTable?: Table) => {
    const activeTable = overrideTable || selectedTable
    if (orderFlowMode === 'TABLE_SERVICE' && !activeTable) {
      if (onRequireTableSelection) {
        onRequireTableSelection()
      } else {
        onAlert({
          title: 'Selectionnez une table',
          message: "En mode service a table, le serveur doit d'abord choisir la table avant les menus.",
          type: 'info',
        })
        onRequireTable()
      }
      return
    }

    if (operatorRole === 'SERVER') {
      void submitServerOrder(activeTable || undefined)
      return
    }

    openNewOrderPayment()
  }


  const handleCheckout = async (mode: PaymentMode) => {
    const activeMethod = paymentMethods.find(m => m.name === mode)
    const activeMethodType = activeMethod?.type || 'OTHER'
    const effectiveTotal = roundedTotal ?? paymentTotal

    if (orderType === 'DELIVERY') {
      if (isFetchingQuote) {
        onAlert({
          title: 'Devis de livraison en cours',
          message: 'Veuillez attendre le calcul du devis avant de finaliser la commande.',
          type: 'info',
        })
        return
      }

      if (deliveryQuoteError) {
        onAlert({
          title: 'Devis de livraison indisponible',
          message: deliveryQuoteError,
          type: 'error',
        })
        return
      }
    }

    const isValid = validateCheckout(
      effectiveTotal,
      activeMethodType,
      selectedBills.length,
      amountReceived,
      onAlert
    )

    if (!isValid) return

    if (isSettlementFlow) {
      await finalizeSettlement(mode)
      return
    }

    await finalizeNewPaidOrder(mode)
  }

  return {
    isProcessing,
    isSettlementFlow,
    paymentTotal,
    paymentModalTitle: isSettlementFlow ? 'Encaissement de la table' : 'Paiement de la commande',
    showReceipt,
    setShowReceipt,
    showPaymentModal,
    setShowPaymentModal: closePaymentModal,
    closePaymentModal,
    lastOrder,
    amountReceived,
    changeAmount,
    promoCode,
    setPromoCode,
    discount,
    loyaltyPointsRedeemed,
    setLoyaltyPointsRedeemed,
    loyaltyDiscount,
    selectedCustomer,
    setSelectedCustomer,
    customerResults,
    calculateChange: (val: string) => calculateChange(val, roundedTotal ?? paymentTotal),
    handleApplyPromo,
    handleCustomerSearch: (q: string) => handleCustomerSearch(q, isSettlementFlow),
    handleCheckoutClick,
    handleCheckout,
    openSettlementForOrder,
    selectedBills,
    onAddBill: (val: number) => handleAddBill(val, roundedTotal ?? paymentTotal),
    onRemoveBill: (id: string) => handleRemoveBill(id, roundedTotal ?? paymentTotal),
    onResetBills: handleResetBills,
    roundedTotal,
    roundingDiff,
    paymentMethods,
    orderType,
    setOrderType,
    deliveryAddress,
    setDeliveryAddress,
    deliveryClientName,
    setDeliveryClientName,
    deliveryClientPhone,
    setDeliveryClientPhone,
    deliveryDistanceKm,
    deliveryDurationMins,
    deliveryFee,
    handleAddressSelect,
  }
}
