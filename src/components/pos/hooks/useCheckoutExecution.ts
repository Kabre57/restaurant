'use client'

import type { Table } from '@prisma/client'
import { addItemsToOrder, createOrder, settleOrderPayment } from '@/app/actions/orders/orders'
import type { CartItem } from '@/store/useCart'
import type { ReceiptOrder } from '../subcomponents/ReceiptModal'
import { createClientRequestId, type PaymentMode } from '../lib/pos-helpers'
import type { RealtimeOrder } from './usePOSRealtime'
import {
  buildCashReceiptMeta,
  buildReceiptItemsFromCart,
  buildReceiptItemsFromOrder,
  isCashPaymentMode,
  type AlertPayload,
  type PaymentContext,
  type PaymentCustomer
} from './usePOSCheckout.helpers'
import { submitServerOrderFlow } from './serverOrderFlow'

type POSPaymentMethod = { id: string; name: string; type: string; icon: string | null; isDefault: boolean; isActive?: boolean }

interface CheckoutExecutionState {
  cashierId: string
  storeId: string
  orderId: number
  isOnline: boolean
  selectedTable: Table | null
  liveActiveOrders: RealtimeOrder[]
  items: CartItem[]
  paymentMethods: POSPaymentMethod[]
  amountReceived: string
  changeAmount: number | null
  roundedTotal: number | null
  paymentTotal: number
  newOrderNetTotal: number
  discount: number
  loyaltyPointsRedeemed: number
  loyaltyDiscount: number
  appliedPromoId: string | null
  selectedCustomer: PaymentCustomer | null
  selectedBills: { id: string; value: number }[]
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  deliveryAddress: string
  deliveryClientName: string
  deliveryClientPhone: string
  deliveryDistanceKm: number | null
  deliveryDurationMins: number | null
  deliveryFee: number
  isSettlementFlow: boolean
  paymentContext: PaymentContext
  cashierName?: string | null
}

interface CheckoutExecutionCallbacks {
  clearCart: () => void
  advanceOrderId: () => void
  mergeLiveOrder: (order: RealtimeOrder) => void
  onAfterCheckout: () => void
  onAlert: (alert: AlertPayload) => void
  updateSessionStats: (amount: number) => void
  setIsProcessing: (val: boolean) => void
  setLastOrder: (val: ReceiptOrder | null) => void
  setShowReceipt: (val: boolean) => void
  closePaymentModal: () => void
  saveOfflineOrder: (orderData: any, netTotal: number) => Promise<void>
}

export function useCheckoutExecution(
  state: CheckoutExecutionState,
  callbacks: CheckoutExecutionCallbacks
) {
  const getPaymentMethodType = (mode: PaymentMode) => state.paymentMethods.find((method) => method.name === mode)?.type || null

  const getReceiptPaymentMeta = (mode: PaymentMode, total: number) => {
    const paymentType = getPaymentMethodType(mode)
    return buildCashReceiptMeta(mode, total, state.amountReceived, state.changeAmount, paymentType)
  }

  const triggerAutoPrint = async (orderData: ReceiptOrder) => {
    callbacks.onAlert({
      title: 'Impression',
      message: "Ticket en cours d'impression...",
      type: 'info'
    })

    try {
      await fetch('/api/hardware/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderData })
      })

      if (isCashPaymentMode(orderData.paymentMode, orderData.paymentType)) {
        await fetch('/api/hardware/cash-drawer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderData.id, total: orderData.total })
        })
      }
    } catch (err) {
      console.error("Erreur lors de l'impression automatique:", err)
    }
  }

  const getSelectedActiveTableOrder = () => {
    if (!state.selectedTable) return null

    return (
      state.liveActiveOrders.find(
        (order) =>
          order.tableId === state.selectedTable!.id &&
          order.status !== 'COMPLETED' &&
          order.status !== 'CANCELLED'
      ) || null
    )
  }

  const submitServerOrder = async (overrideTable?: Table) => {
    callbacks.setIsProcessing(true)
    const activeTable = overrideTable || state.selectedTable
    try {
      await submitServerOrderFlow({
        cashierId: state.cashierId,
        storeId: state.storeId,
        orderId: state.orderId,
        selectedTable: activeTable,
        liveActiveOrders: state.liveActiveOrders,
        items: state.items,
        isOnline: state.isOnline,
        total: state.paymentTotal,
        clearCart: callbacks.clearCart,
        refreshSyncQueueCount: async () => {}, // empty callback mock as queue handled by offline checkout
        advanceOrderId: callbacks.advanceOrderId,
        mergeLiveOrder: callbacks.mergeLiveOrder,
        onAfterCheckout: callbacks.onAfterCheckout,
        onAlert: callbacks.onAlert,
        setLastOrder: callbacks.setLastOrder,
        setShowReceipt: callbacks.setShowReceipt
      })
    } finally {
      callbacks.setIsProcessing(false)
    }
  }

  const finalizeSettlement = async (mode: PaymentMode) => {
    if (!state.isSettlementFlow || state.paymentContext.kind !== 'SETTLEMENT') return

    if (!state.isOnline) {
      callbacks.onAlert({
        title: 'Connexion requise',
        message: "L'encaissement d'une commande deja prise doit etre fait en ligne pour garantir un suivi fiable."
      })
      return
    }

    callbacks.setIsProcessing(true)

    try {
      const orderIdObj = state.paymentContext.order.id
      const result = await settleOrderPayment(orderIdObj, mode, state.storeId)

      if (result.success && result.order) {
        callbacks.mergeLiveOrder(result.order)
        const receiptData = {
          id: result.order.id,
          displayId: state.orderId,
          items: buildReceiptItemsFromOrder(result.order),
          total: Number(result.order.total || state.paymentTotal),
          date: new Date(),
          estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
          cashierName: state.cashierName || null,
          ...getReceiptPaymentMeta(mode, Number(result.order.total || state.paymentTotal))
        }
        callbacks.setLastOrder(receiptData)

        callbacks.updateSessionStats(Number(result.order.total || state.paymentTotal))
        void triggerAutoPrint(receiptData)

        callbacks.setShowReceipt(true)
        callbacks.closePaymentModal()
        callbacks.onAfterCheckout()
        return
      }

      callbacks.onAlert({
        title: 'Encaissement impossible',
        message: result.error || "Le paiement de cette table n'a pas pu etre finalise."
      })
    } finally {
      callbacks.setIsProcessing(false)
    }
  }

  const finalizeNewPaidOrder = async (mode: PaymentMode) => {
    const currentTotal = state.newOrderNetTotal
    const paymentType = getPaymentMethodType(mode)
    const isCashPayment = isCashPaymentMode(mode, paymentType)
    const cashTotal = isCashPayment && state.roundedTotal !== null ? state.roundedTotal : currentTotal
    const paymentMode = mode

    callbacks.setIsProcessing(true)

    const existingOrder = getSelectedActiveTableOrder()

    try {
      if (existingOrder) {
        const result = await addItemsToOrder(
          existingOrder.id,
          state.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            options: item.options
          })),
          currentTotal
        )

        if (result.success && result.order) {
          callbacks.mergeLiveOrder(result.order)
          const receiptData = {
            id: result.order.id,
            displayId: state.orderId,
            items: buildReceiptItemsFromCart(state.items),
            total: currentTotal,
            date: new Date(),
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
            cashierName: state.cashierName || null,
            ...getReceiptPaymentMeta(paymentMode, currentTotal)
          }
          callbacks.setLastOrder(receiptData)

          callbacks.clearCart()
          callbacks.updateSessionStats(currentTotal)
          void triggerAutoPrint(receiptData)

          callbacks.setShowReceipt(true)
          callbacks.closePaymentModal()
          callbacks.advanceOrderId()
          callbacks.onAfterCheckout()
        } else {
          callbacks.onAlert({
            title: 'Erreur',
            message: result.error || "Impossible d'ajouter ces articles a la commande de la table."
          })
        }

        return
      }

      const orderData = {
        clientRequestId: createClientRequestId(state.storeId, state.cashierId),
        storeId: state.storeId,
        cashierId: state.cashierId,
        total: cashTotal,
        discount: state.discount + state.loyaltyDiscount,
        promotionId: state.appliedPromoId || undefined,
        customerId: state.selectedCustomer?.id || undefined,
        loyaltyPointsRedeemed: state.loyaltyPointsRedeemed,
        items: state.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          options: item.options
        })),
        type: state.orderType,
        paymentMode,
        paymentStatus: 'REUSSIE' as const,
        tableId: state.selectedTable?.id || undefined,
        externalPayload: {
          selectedBills: state.selectedBills.map(b => b.value),
          deliveryAddress: state.deliveryAddress,
          deliveryClientName: state.deliveryClientName,
          deliveryClientPhone: state.deliveryClientPhone,
        }
      }

      if (state.isOnline) {
        const result = await createOrder(orderData)
        if (result.success && result.order) {
          callbacks.mergeLiveOrder(result.order)
          const receiptData = {
            ...orderData,
            id: result.order.id,
            estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
            cashierName: state.cashierName || null,
            ...getReceiptPaymentMeta(paymentMode, currentTotal),
            items: buildReceiptItemsFromCart(state.items)
          }
          callbacks.setLastOrder(receiptData)
          callbacks.updateSessionStats(currentTotal)
          void triggerAutoPrint(receiptData)

          callbacks.setShowReceipt(true)
          callbacks.closePaymentModal()
          callbacks.clearCart()
          callbacks.advanceOrderId()
          callbacks.onAfterCheckout()
        } else {
          callbacks.onAlert({
            title: 'Paiement Echoue',
            message: result.error || "La transaction n'a pas pu etre finalisee."
          })
        }
      } else {
        await callbacks.saveOfflineOrder(orderData, currentTotal)
        const receiptData = {
          ...orderData,
          id: orderData.clientRequestId,
          isOffline: true,
          cashierName: state.cashierName || null,
          ...getReceiptPaymentMeta(paymentMode, currentTotal),
          items: buildReceiptItemsFromCart(state.items)
        }
        callbacks.setLastOrder(receiptData)
        void triggerAutoPrint(receiptData)

        callbacks.setShowReceipt(true)
        callbacks.closePaymentModal()
        callbacks.clearCart()
        callbacks.advanceOrderId()
        callbacks.onAfterCheckout()
      }
    } catch (error) {
      console.error('Checkout failed, order queued for sync:', error)
      const orderData = {
        clientRequestId: createClientRequestId(state.storeId, state.cashierId),
        storeId: state.storeId,
        cashierId: state.cashierId,
        total: currentTotal,
        discount: state.discount + state.loyaltyDiscount,
        promotionId: state.appliedPromoId || undefined,
        customerId: state.selectedCustomer?.id || undefined,
        loyaltyPointsRedeemed: state.loyaltyPointsRedeemed,
        items: state.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          options: item.options
        })),
        type: state.orderType,
        paymentMode,
        paymentStatus: 'REUSSIE' as const,
        tableId: state.selectedTable?.id || undefined,
        externalPayload: {
          selectedBills: state.selectedBills.map(b => b.value),
          deliveryAddress: state.deliveryAddress,
          deliveryClientName: state.deliveryClientName,
          deliveryClientPhone: state.deliveryClientPhone,
        }
      }

      await callbacks.saveOfflineOrder(orderData, currentTotal)
      const receiptData = {
        ...orderData,
        id: orderData.clientRequestId,
        isOffline: true,
        cashierName: state.cashierName || null,
        ...getReceiptPaymentMeta(paymentMode, currentTotal),
        items: buildReceiptItemsFromCart(state.items)
      }
      callbacks.setLastOrder(receiptData)
      void triggerAutoPrint(receiptData)

      callbacks.setShowReceipt(true)
      callbacks.closePaymentModal()
      callbacks.clearCart()
      callbacks.advanceOrderId()
      callbacks.onAfterCheckout()
    } finally {
      callbacks.setIsProcessing(false)
    }
  }

  return {
    submitServerOrder,
    finalizeSettlement,
    finalizeNewPaidOrder
  }
}
