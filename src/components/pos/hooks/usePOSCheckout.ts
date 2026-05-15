'use client'

import { useState } from 'react'
import type { Table } from '@prisma/client'

import { addItemsToOrder, createOrder, settleOrderPayment } from '@/app/actions/orders'
import { searchCustomer, validatePromotion } from '@/app/actions/loyalty'
import { addOrderToSyncQueue } from '@/lib/idb'
import type { CartItem } from '@/store/useCart'
import type { PaymentCustomer } from '../lib/payment-types'
import type { ReceiptOrder } from '../subcomponents/ReceiptModal'
import { createClientRequestId, type OrderFlowMode, type PaymentMode } from '../lib/pos-helpers'
import type { RealtimeOrder } from './usePOSRealtime'

type AlertPayload = {
  title: string
  message: string
  type?: 'error' | 'success' | 'info'
}

type POSOperatorRole = 'CASHIER' | 'SERVER'

type PaymentContext =
  | { kind: 'NEW_ORDER' }
  | { kind: 'SETTLEMENT'; order: RealtimeOrder }

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

function buildReceiptItemsFromCart(items: CartItem[]): ReceiptOrder['items'] {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }))
}

function buildReceiptItemsFromOrder(order: RealtimeOrder): ReceiptOrder['items'] {
  return (order.items || []).map((item) => ({
    name: item.product?.name || 'Produit',
    quantity: item.quantity,
    price: Number(item.price || 0),
  }))
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [lastOrder, setLastOrder] = useState<ReceiptOrder | null>(null)
  const [amountReceived, setAmountReceived] = useState('')
  const [changeAmount, setChangeAmount] = useState<number | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [appliedPromoId, setAppliedPromoId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<PaymentCustomer | null>(null)
  const [customerResults, setCustomerResults] = useState<PaymentCustomer[]>([])
  const [paymentContext, setPaymentContext] = useState<PaymentContext>({ kind: 'NEW_ORDER' })

  const isSettlementFlow = paymentContext.kind === 'SETTLEMENT'
  const grossTotal = getTotal()
  const newOrderNetTotal = Math.max(0, grossTotal - discount)
  const paymentTotal = isSettlementFlow
    ? Number(paymentContext.order.total || 0)
    : newOrderNetTotal

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
    setPromoCode('')
    setDiscount(0)
    setAppliedPromoId(null)
    setSelectedCustomer(null)
    setCustomerResults([])
  }

  const closePaymentModal = () => {
    setShowPaymentModal(false)
    setPaymentContext({ kind: 'NEW_ORDER' })
    resetPaymentFields()
  }

  const calculateChange = (value: string) => {
    setAmountReceived(value)
    if (value === '') {
      setChangeAmount(null)
      return
    }

    const received = parseFloat(value)
    setChangeAmount(received - paymentTotal)
  }

  const handleApplyPromo = async () => {
    if (!promoCode || isSettlementFlow) return

    const result = await validatePromotion(promoCode, storeId, grossTotal)
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

  const buildCashReceiptMeta = (mode: PaymentMode, total: number) => ({
    paymentMode: mode,
    amountReceived: mode === 'ESPECES' ? parseInt(amountReceived || '0', 10) : total,
    changeAmount: mode === 'ESPECES' ? changeAmount ?? 0 : 0,
  })

  const openSettlementForOrder = (order: RealtimeOrder) => {
    setPaymentContext({ kind: 'SETTLEMENT', order })
    resetPaymentFields()
    setShowPaymentModal(true)
  }

  const openNewOrderPayment = () => {
    setPaymentContext({ kind: 'NEW_ORDER' })
    resetPaymentFields()
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

  // Le serveur enregistre une commande non encaissee, qui sera reglee plus tard a la caisse.
  const submitServerOrder = async () => {
    const currentTotal = grossTotal
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
          setLastOrder({
            id: result.order.id,
            displayId: orderId,
            items: buildReceiptItemsFromCart(items),
            total: currentTotal,
            date: new Date(),
            paymentMode: 'A regler en caisse',
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
          })

          clearCart()
          setShowReceipt(true)
          advanceOrderId()
          onAfterCheckout()
          return
        }

        onAlert({
          title: 'Erreur',
          message: result.error || "Impossible d'ajouter ces articles a la commande de la table.",
        })
        return
      }

      const orderData = {
        clientRequestId: createClientRequestId(storeId, cashierId),
        storeId,
        cashierId,
        total: currentTotal,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        type: 'DINE_IN' as const,
        paymentMode: 'ESPECES' as const,
        paymentStatus: 'EN_ATTENTE' as const,
        tableId: selectedTable?.id || undefined,
      }

      if (isOnline) {
        const result = await createOrder(orderData)
        if (result.success && result.order) {
          mergeLiveOrder(result.order)
          setLastOrder({
            ...orderData,
            id: result.order.id,
            paymentMode: 'A regler en caisse',
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
          })
          setShowReceipt(true)
          clearCart()
          advanceOrderId()
          onAfterCheckout()
          return
        }

        onAlert({
          title: 'Commande non envoyee',
          message: result.error || "La commande n'a pas pu etre envoyee en cuisine.",
        })
        return
      }

      await addOrderToSyncQueue(orderData)
      await refreshSyncQueueCount()
      setLastOrder({
        ...orderData,
        id: orderData.clientRequestId,
        isOffline: true,
        paymentMode: 'A regler en caisse',
      })
      setShowReceipt(true)
      clearCart()
      advanceOrderId()
      onAfterCheckout()
    } catch (error) {
      console.error('Server order failed, order queued for sync:', error)
      const orderData = {
        clientRequestId: createClientRequestId(storeId, cashierId),
        storeId,
        cashierId,
        total: currentTotal,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        type: 'DINE_IN' as const,
        paymentMode: 'ESPECES' as const,
        paymentStatus: 'EN_ATTENTE' as const,
        tableId: selectedTable?.id || undefined,
      }

      await addOrderToSyncQueue(orderData)
      await refreshSyncQueueCount()
      setLastOrder({
        ...orderData,
        id: orderData.clientRequestId,
        isOffline: true,
        paymentMode: 'A regler en caisse',
      })
      setShowReceipt(true)
      clearCart()
      advanceOrderId()
      onAfterCheckout()
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
        setLastOrder({
          id: result.order.id,
          displayId: orderId,
          items: buildReceiptItemsFromOrder(result.order),
          total: Number(result.order.total || paymentTotal),
          date: new Date(),
          estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
          ...buildCashReceiptMeta(mode, Number(result.order.total || paymentTotal)),
        })

        updateSessionStats(Number(result.order.total || paymentTotal))
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
          setLastOrder({
            id: result.order.id,
            displayId: orderId,
            items: buildReceiptItemsFromCart(items),
            total: currentTotal,
            date: new Date(),
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
            ...buildCashReceiptMeta(paymentMode, currentTotal),
          })

          clearCart()
          updateSessionStats(currentTotal)
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
        total: currentTotal,
        discount,
        promotionId: appliedPromoId || undefined,
        customerId: selectedCustomer?.id || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        type: 'DINE_IN' as const,
        paymentMode,
        tableId: selectedTable?.id || undefined,
      }

      if (isOnline) {
        const result = await createOrder(orderData)
        if (result.success && result.order) {
          mergeLiveOrder(result.order)
          setLastOrder({
            ...orderData,
            id: result.order.id,
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
            ...buildCashReceiptMeta(paymentMode, currentTotal),
          })
          updateSessionStats(currentTotal)
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
        setLastOrder({
          ...orderData,
          id: orderData.clientRequestId,
          isOffline: true,
          ...buildCashReceiptMeta(paymentMode, currentTotal),
        })
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
        discount,
        promotionId: appliedPromoId || undefined,
        customerId: selectedCustomer?.id || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        type: 'DINE_IN' as const,
        paymentMode,
        tableId: selectedTable?.id || undefined,
      }

      await addOrderToSyncQueue(orderData)
      await refreshSyncQueueCount()
      updateSessionStats(currentTotal)
      setLastOrder({
        ...orderData,
        id: orderData.clientRequestId,
        isOffline: true,
        ...buildCashReceiptMeta(paymentMode, currentTotal),
      })
      setShowReceipt(true)
      closePaymentModal()
      clearCart()
      advanceOrderId()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCheckout = async (mode: PaymentMode) => {
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
    selectedCustomer,
    setSelectedCustomer,
    customerResults,
    calculateChange,
    handleApplyPromo,
    handleCustomerSearch,
    handleCheckoutClick,
    handleCheckout,
    openSettlementForOrder,
  }
}
