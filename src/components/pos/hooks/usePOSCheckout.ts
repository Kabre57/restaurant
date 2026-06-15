// src/components/pos/hooks/usePOSCheckout.ts
'use client'

import { useEffect, useState } from 'react'
import type { Table } from '@prisma/client'

import { getPaymentMethods } from '@/app/actions/orders/paymentMethods'
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
    handleAddressSelect,
    resetDeliveryDetails
  } = useDeliveryDetails()

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
      paymentContext
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

    getPaymentMethods(storeId).then((res) => {
      if (isCancelled) return
      if (res.success && res.methods) {
        const configuredMethods = res.methods as POSPaymentMethod[]
        const activeMethods = configuredMethods.filter((method) => method.isActive !== false)
        const completedMethods = mergeMissingDefaultPaymentMethods(activeMethods, configuredMethods)
        setPaymentMethods(completedMethods.length > 0 ? completedMethods : DEFAULT_PAYMENT_METHODS)
      } else {
        setPaymentMethods(DEFAULT_PAYMENT_METHODS)
      }
    })

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

<<<<<<< HEAD
  const submitServerOrder = async () => {
    setIsProcessing(true)
    try {
      await submitServerOrderFlow({
        cashierId,
        storeId,
        orderId,
        selectedTable,
        liveActiveOrders,
        items,
        isOnline,
        total: grossTotal,
        clearCart,
        refreshSyncQueueCount,
        advanceOrderId,
        mergeLiveOrder,
        onAfterCheckout,
        onAlert,
        setLastOrder,
        setShowReceipt,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const finalizeSettlement = async (mode: PaymentMode) => {
    if (!isSettlementFlow) return

    if (!isOnline) {
      onAlert({
        title: 'Connexion requise',
        message: "L'encaissement d'une commande deja prise doit etre fait en ligne pour garantir un suivi fiable.",
      })
      return
    }

    setIsProcessing(true)

    try {
      const result = await settleOrderPayment(paymentContext.order.id, mode, storeId)

      if (result.success && result.order) {
        mergeLiveOrder(result.order)
        const receiptData = {
          id: result.order.id,
          displayId: orderId,
          items: buildReceiptItemsFromOrder(result.order),
          total: Number(result.order.total || paymentTotal),
          date: new Date(),
          estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
          tableId: result.order.tableId || paymentContext.order.tableId || undefined,
          ...getReceiptPaymentMeta(mode, Number(result.order.total || paymentTotal)),
        }
        setLastOrder(receiptData)

        updateSessionStats(Number(result.order.total || paymentTotal))
        
        // Déclenchement automatique de l'impression physique du ticket
        void triggerAutoPrint(receiptData)

        setShowReceipt(true)
        closePaymentModal()
        onAfterCheckout()
        return
      }

      onAlert({
        title: 'Encaissement impossible',
        message: result.error || "Le paiement de cette table n'a pas pu etre finalise.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Gere la creation locale, distante et offline d'une commande encaissee a la caisse.
  const finalizeNewPaidOrder = async (mode: PaymentMode) => {
    const currentTotal = newOrderNetTotal
    const paymentType = getPaymentMethodType(mode)
    const isCashPayment = isCashPaymentMode(mode, paymentType)
    // Appliquer l'arrondi uniquement pour les paiements espèces
    const cashTotal = isCashPayment && roundedTotal !== null ? roundedTotal : currentTotal
    const paymentMode = mode

    setIsProcessing(true)

    const existingOrder = getSelectedActiveTableOrder()

    try {
      if (existingOrder) {
        const result = await addItemsToOrder(
          existingOrder.id,
          items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            options: item.options,
          })),
          currentTotal
        )

        if (result.success && result.order) {
          mergeLiveOrder(result.order)
          const receiptData = {
            id: result.order.id,
            displayId: orderId,
            items: buildReceiptItemsFromCart(items),
            total: currentTotal,
            date: new Date(),
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
            tableId: selectedTable?.id || undefined,
            ...getReceiptPaymentMeta(paymentMode, currentTotal),
          }
          setLastOrder(receiptData)

          clearCart()
          updateSessionStats(currentTotal)
          
          // Déclenchement automatique de l'impression physique du ticket
          void triggerAutoPrint(receiptData)

          setShowReceipt(true)
          closePaymentModal()
          advanceOrderId()
          onAfterCheckout()
        } else {
          onAlert({
            title: 'Erreur',
            message: result.error || "Impossible d'ajouter ces articles a la commande de la table.",
          })
        }

        return
      }

      const orderData = {
        clientRequestId: createClientRequestId(storeId, cashierId),
        storeId,
        cashierId,
        total: cashTotal,
        discount: discount + loyaltyDiscount,
        promotionId: appliedPromoId || undefined,
        customerId: selectedCustomer?.id || undefined,
        loyaltyPointsRedeemed: loyaltyPointsRedeemed,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        type: orderType,
        paymentMode,
        paymentStatus: 'REUSSIE' as const,
        tableId: selectedTable?.id || undefined,
        externalPayload: {
          selectedBills: selectedBills.map(b => b.value),
          deliveryAddress,
          deliveryClientName,
          deliveryClientPhone,
          deliveryDistanceKm,
          deliveryDurationMins,
          deliveryFee,
        }
      }

      if (isOnline) {
        const result = await createOrder(orderData)
        if (result.success && result.order) {
          mergeLiveOrder(result.order)
          const receiptData = {
            ...orderData,
            id: result.order.id,
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
            tableId: selectedTable?.id || undefined,
            ...getReceiptPaymentMeta(paymentMode, currentTotal),
            items: buildReceiptItemsFromCart(items),
          }
          setLastOrder(receiptData)
          updateSessionStats(currentTotal)
          
          // Déclenchement automatique de l'impression physique du ticket
          void triggerAutoPrint(receiptData)

          setShowReceipt(true)
          closePaymentModal()
          clearCart()
          advanceOrderId()
          onAfterCheckout()
        } else {
          onAlert({
            title: 'Paiement Echoue',
            message: result.error || "La transaction n'a pas pu etre finalisee.",
          })
        }
      } else {
        await addOrderToSyncQueue(orderData)
        await refreshSyncQueueCount()
        updateSessionStats(currentTotal)
        const receiptData = {
          ...orderData,
          id: orderData.clientRequestId,
          isOffline: true,
          tableId: selectedTable?.id || undefined,
          ...getReceiptPaymentMeta(paymentMode, currentTotal),
          items: buildReceiptItemsFromCart(items),
        }
        setLastOrder(receiptData)
        
        // Déclenchement automatique de l'impression physique du ticket même hors-ligne
        void triggerAutoPrint(receiptData)

        setShowReceipt(true)
        closePaymentModal()
        clearCart()
        advanceOrderId()
      }
    } catch (error) {
      console.error('Checkout failed, order queued for sync:', error)
      const orderData = {
        clientRequestId: createClientRequestId(storeId, cashierId),
        storeId,
        cashierId,
        total: currentTotal,
        discount: discount + loyaltyDiscount,
        promotionId: appliedPromoId || undefined,
        customerId: selectedCustomer?.id || undefined,
        loyaltyPointsRedeemed: loyaltyPointsRedeemed,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        type: orderType,
        paymentMode,
        paymentStatus: 'REUSSIE' as const,
        tableId: selectedTable?.id || undefined,
        externalPayload: {
          selectedBills: selectedBills.map(b => b.value),
          deliveryAddress,
          deliveryClientName,
          deliveryClientPhone,
          deliveryDistanceKm,
          deliveryDurationMins,
          deliveryFee,
        }
      }

      await addOrderToSyncQueue(orderData)
      await refreshSyncQueueCount()
      updateSessionStats(currentTotal)
      const receiptData = {
        ...orderData,
        id: orderData.clientRequestId,
        isOffline: true,
        tableId: selectedTable?.id || undefined,
        ...getReceiptPaymentMeta(paymentMode, currentTotal),
        items: buildReceiptItemsFromCart(items),
      }
      setLastOrder(receiptData)
      
      // Déclenchement automatique de l'impression physique du ticket
      void triggerAutoPrint(receiptData)

      setShowReceipt(true)
      closePaymentModal()
      clearCart()
      advanceOrderId()
    } finally {
      setIsProcessing(false)
    }
  }

=======
>>>>>>> bbaf5ff (Refactorisation)
  const handleCheckout = async (mode: PaymentMode) => {
    const activeMethod = paymentMethods.find(m => m.name === mode)
    const activeMethodType = activeMethod?.type || 'OTHER'
    const effectiveTotal = roundedTotal ?? paymentTotal

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
