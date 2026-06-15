// src/components/pos/hooks/usePOSCheckout.ts
'use client'

import { useEffect, useState } from 'react'
import type { Table } from '@prisma/client'

import { addItemsToOrder, createOrder, settleOrderPayment } from '@/app/actions/orders/orders'
import { searchCustomer, validatePromotion } from '@/app/actions/clients/loyalty'
import { getRoundedTotal } from '@/app/actions/store/storeSettings'
import { getPaymentMethods } from '@/app/actions/orders/paymentMethods'
import { addOrderToSyncQueue } from '@/lib/idb'
import type { CartItem } from '@/store/useCart'
import type { ReceiptOrder } from '../subcomponents/ReceiptModal'
import { createClientRequestId, type OrderFlowMode, type PaymentMode } from '../lib/pos-helpers'
import type { RealtimeOrder } from './usePOSRealtime'
import {
  buildCashReceiptMeta,
  buildReceiptItemsFromCart,
  buildReceiptItemsFromOrder,
  isCashPaymentMode,
  type AlertPayload,
  type PaymentContext,
  type PaymentCustomer,
} from './usePOSCheckout.helpers'
import { submitServerOrderFlow } from './serverOrderFlow'

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
  onAlert: (alert: AlertPayload) => void
  operatorRole?: POSOperatorRole
}

function createBillSelectionId(value: number) {
  return `${value}-${Date.now()}-${Math.random()}`
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
  onAlert,
  operatorRole = 'CASHIER',
}: UsePOSCheckoutOptions) {
  const [paymentMethods, setPaymentMethods] = useState<POSPaymentMethod[]>(DEFAULT_PAYMENT_METHODS)

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

  const [isProcessing, setIsProcessing] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [lastOrder, setLastOrder] = useState<ReceiptOrder | null>(null)
  const [amountReceived, setAmountReceived] = useState('')
  const [changeAmount, setChangeAmount] = useState<number | null>(null)
  const [selectedBills, setSelectedBills] = useState<{ id: string; value: number }[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loyaltyPointsRedeemed, setLoyaltyPointsRedeemed] = useState(0)
  const [appliedPromoId, setAppliedPromoId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<PaymentCustomer | null>(null)
  const [customerResults, setCustomerResults] = useState<PaymentCustomer[]>([])
  const [paymentContext, setPaymentContext] = useState<PaymentContext>({ kind: 'NEW_ORDER' })
  const [roundedTotal, setRoundedTotal] = useState<number | null>(null)
  const [roundingDiff, setRoundingDiff] = useState(0)

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

  const isSettlementFlow = paymentContext.kind === 'SETTLEMENT'
  const grossTotal = getTotal()
  const loyaltyDiscount = loyaltyPointsRedeemed * 10
  const totalDiscount = discount + loyaltyDiscount
  const newOrderNetTotal = Math.max(0, grossTotal - totalDiscount)
  const deliveryExtra = orderType === 'DELIVERY' ? deliveryFee : 0
  const paymentTotal = (isSettlementFlow
    ? Number(paymentContext.order.total || 0)
    : newOrderNetTotal) + deliveryExtra

  // Fonction d'impression automatique du ticket et ouverture du tiroir-caisse
  const triggerAutoPrint = async (orderData: ReceiptOrder) => {
    onAlert({
      title: 'Impression',
      message: "Ticket en cours d'impression...",
      type: 'info',
    })

    try {
      await fetch('/api/hardware/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderData }),
      })

      if (isCashPaymentMode(orderData.paymentMode, orderData.paymentType)) {
        await fetch('/api/hardware/cash-drawer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderData.id, total: orderData.total }),
        })
      }
    } catch (err) {
      console.error("Erreur lors de l'impression automatique:", err)
    }
  }

  const getSelectedActiveTableOrder = () => {
    if (!selectedTable) return null

    return (
      liveActiveOrders.find(
        (order) =>
          order.tableId === selectedTable.id &&
          order.status !== 'COMPLETED' &&
          order.status !== 'CANCELLED'
      ) || null
    )
  }

  const resetPaymentFields = () => {
    setAmountReceived('')
    setChangeAmount(null)
    setSelectedBills([])
    setPromoCode('')
    setDiscount(0)
    setLoyaltyPointsRedeemed(0)
    setAppliedPromoId(null)
    setSelectedCustomer(null)
    setCustomerResults([])
    setRoundedTotal(null)
    setRoundingDiff(0)
  }

  const closePaymentModal = () => {
    setShowPaymentModal(false)
    setPaymentContext({ kind: 'NEW_ORDER' })
    resetPaymentFields()
  }

  const handleAddBill = (value: number) => {
    const newBill = {
      id: createBillSelectionId(value),
      value,
    }
    const newBills = [...selectedBills, newBill]
    setSelectedBills(newBills)

    const totalFromBills = newBills.reduce((sum, b) => sum + b.value, 0)
    calculateChange(totalFromBills.toString())
  }

  const handleRemoveBill = (id: string) => {
    const updatedBills = selectedBills.filter((bill) => bill.id !== id)
    setSelectedBills(updatedBills)

    const totalFromBills = updatedBills.reduce((sum, b) => sum + b.value, 0)
    if (totalFromBills > 0) {
      calculateChange(totalFromBills.toString())
    } else {
      calculateChange('')
    }
  }

  const handleResetBills = () => {
    setSelectedBills([])
    calculateChange('')
  }


  const calculateChange = (value: string) => {
    setAmountReceived(value)
    if (value === '') {
      setChangeAmount(null)
      return
    }

    const received = parseFloat(value)
    // Utiliser le total arrondi pour le calcul du rendu de monnaie si disponible
    const effectiveTotal = roundedTotal ?? paymentTotal
    // On conserve la valeur négative éventuelle pour bloquer la validation si le montant est insuffisant
    setChangeAmount(received - effectiveTotal)
  }

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
      message: result.error || "Ce code promo n'est pas valide.",
    })
    setDiscount(0)
    setAppliedPromoId(null)
  }

  const handleCustomerSearch = async (query: string) => {
    if (query.length < 3 || isSettlementFlow) {
      setCustomerResults([])
      return
    }

    const results = await searchCustomer(query)
    setCustomerResults(results as PaymentCustomer[])
  }

  const getPaymentMethodType = (mode: PaymentMode) => paymentMethods.find((method) => method.name === mode)?.type || null

  const getReceiptPaymentMeta = (mode: PaymentMode, total: number) => {
    const paymentType = getPaymentMethodType(mode)
    return buildCashReceiptMeta(mode, total, amountReceived, changeAmount, paymentType)
  }

  const openSettlementForOrder = (order: RealtimeOrder) => {
    setPaymentContext({ kind: 'SETTLEMENT', order })
    resetPaymentFields()
    setShowPaymentModal(true)
  }

  const openNewOrderPayment = async () => {
    setPaymentContext({ kind: 'NEW_ORDER' })
    resetPaymentFields()

    // Pré-calculer l'arrondi pour les paiements espèces
    try {
      const result = await getRoundedTotal(newOrderNetTotal, storeId)
      if (result.roundingDiff !== 0) {
        setRoundedTotal(result.roundedTotal)
        setRoundingDiff(result.roundingDiff)
      }
    } catch {
      // En cas d'erreur, on continue sans arrondi
    }

    setShowPaymentModal(true)
  }

  const handleCheckoutClick = () => {
    if (orderFlowMode === 'TABLE_SERVICE' && !selectedTable) {
      onAlert({
        title: 'Selectionnez une table',
        message: "En mode service a table, le serveur doit d'abord choisir la table avant les menus.",
        type: 'info',
      })
      onRequireTable()
      return
    }

    if (operatorRole === 'SERVER') {
      void submitServerOrder()
      return
    }

    openNewOrderPayment()
  }

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

  const handleCheckout = async (mode: PaymentMode) => {
    const activeMethod = paymentMethods.find(m => m.name === mode)
    const activeMethodType = activeMethod?.type || 'OTHER'
    const effectiveTotal = roundedTotal ?? paymentTotal

    // 1. Empêcher la validation d'une commande de 0 FCFA ou moins
    if (effectiveTotal <= 0) {
      onAlert({
        title: 'Montant Invalide',
        message: 'Le montant total de la commande ne peut pas être inférieur ou égal à 0 FCFA.',
        type: 'error',
      })
      return
    }

    // 2. Empêcher la validation si le montant reçu est insuffisant ou égal à 0 en espèces ou billets
    const isCashOrFallback = activeMethodType === 'CASH' || selectedBills.length > 0 || parseFloat(amountReceived) > 0
    if (isCashOrFallback) {
      const received = parseFloat(amountReceived) || 0
      if (received <= 0) {
        onAlert({
          title: 'Montant Reçu Requis',
          message: 'Veuillez saisir un montant reçu supérieur à 0 FCFA.',
          type: 'error',
        })
        return
      }
      if (received < effectiveTotal) {
        onAlert({
          title: 'Paiement Insuffisant',
          message: `Le montant reçu (${received.toLocaleString()} FCFA) est inférieur au total de la commande (${effectiveTotal.toLocaleString()} FCFA).`,
          type: 'error',
        })
        return
      }
    }

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
    calculateChange,
    handleApplyPromo,
    handleCustomerSearch,
    handleCheckoutClick,
    handleCheckout,
    openSettlementForOrder,
    selectedBills,
    onAddBill: handleAddBill,
    onRemoveBill: handleRemoveBill,
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
