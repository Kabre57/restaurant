import type { Table } from '@prisma/client'
import { addItemsToOrder, createOrder } from '@/app/actions/orders/orders'
import { addOrderToSyncQueue } from '@/lib/idb'
import type { CartItem } from '@/store/useCart'
import { createClientRequestId } from '../lib/pos-helpers'
import type { ReceiptOrder } from '../subcomponents/ReceiptModal'
import type { RealtimeOrder } from './usePOSRealtime'
import { buildReceiptItemsFromCart, type AlertPayload } from './usePOSCheckout.helpers'
import { printReceiptClient } from '@/lib/hardware/clientAgent'

type ServerOrderFlowContext = {
  cashierId: string
  storeId: string
  orderId: number
  selectedTable: Table | null
  liveActiveOrders: RealtimeOrder[]
  items: CartItem[]
  isOnline: boolean
  total: number
  clearCart: () => void
  refreshSyncQueueCount: () => Promise<unknown>
  advanceOrderId: () => void
  mergeLiveOrder: (order: RealtimeOrder) => void
  onAfterCheckout: () => void
  onAlert: (alert: AlertPayload) => void
  setLastOrder: (order: ReceiptOrder) => void
  setShowReceipt: (show: boolean) => void
}

function getSelectedActiveTableOrder(ctx: ServerOrderFlowContext) {
  if (!ctx.selectedTable) return null

  return ctx.liveActiveOrders.find(
    (order) =>
      order.tableId === ctx.selectedTable?.id &&
      order.status !== 'COMPLETED' &&
      order.status !== 'CANCELLED'
  ) || null
}

function buildServerOrderData(ctx: ServerOrderFlowContext) {
  return {
    clientRequestId: createClientRequestId(ctx.storeId, ctx.cashierId),
    storeId: ctx.storeId,
    cashierId: ctx.cashierId,
    total: ctx.total,
    items: ctx.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
      options: item.options,
    })),
    type: 'DINE_IN' as const,
    paymentMode: 'ESPECES' as const,
    paymentStatus: 'EN_ATTENTE' as const,
    tableId: ctx.selectedTable?.id || undefined,
  }
}

async function queueServerOrder(ctx: ServerOrderFlowContext) {
  const orderData = buildServerOrderData(ctx)
  await addOrderToSyncQueue(orderData)
  await ctx.refreshSyncQueueCount()
  const receiptData = {
    ...orderData,
    id: orderData.clientRequestId,
    isOffline: true,
    paymentMode: 'A regler en caisse',
  }
  ctx.setLastOrder(receiptData)
  
  // Déclenchement automatique de l'impression physique du ticket même hors-ligne
  try {
    ctx.onAlert({
      title: 'Impression',
      message: "Bon de commande en cours d'impression...",
      type: 'info',
    })
    await printReceiptClient(receiptData)
  } catch (err) {
    console.error("Erreur lors de l'impression automatique du bon de commande:", err)
  }

  ctx.setShowReceipt(true)
  ctx.clearCart()
  ctx.advanceOrderId()
  ctx.onAfterCheckout()
}

export async function submitServerOrderFlow(ctx: ServerOrderFlowContext) {
  const existingOrder = getSelectedActiveTableOrder(ctx)

  try {
    if (existingOrder) {
      const result = await addItemsToOrder(
        existingOrder.id,
        ctx.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          options: item.options,
        })),
        ctx.total
      )

      if (result.success && result.order) {
        ctx.mergeLiveOrder(result.order)
        const receiptData = {
          id: result.order.id,
          displayId: ctx.orderId,
          items: buildReceiptItemsFromCart(ctx.items),
          total: ctx.total,
          date: new Date(),
          paymentMode: 'A regler en caisse',
          estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
          tableId: ctx.selectedTable?.id || undefined,
        }
        ctx.setLastOrder(receiptData)

        // Déclenchement automatique de l'impression physique du ticket
        try {
          ctx.onAlert({
            title: 'Impression',
            message: "Bon de commande en cours d'impression...",
            type: 'info',
          })
          await printReceiptClient(receiptData)
        } catch (err) {
          console.error("Erreur lors de l'impression automatique du bon de commande:", err)
        }

        ctx.clearCart()
        ctx.setShowReceipt(true)
        ctx.advanceOrderId()
        ctx.onAfterCheckout()
        return
      }

      ctx.onAlert({ title: 'Erreur', message: result.error || "Impossible d'ajouter ces articles a la commande de la table." })
      return
    }

    const orderData = buildServerOrderData(ctx)
    if (!ctx.isOnline) {
      await queueServerOrder(ctx)
      return
    }

    const result = await createOrder(orderData)
    if (result.success && result.order) {
      ctx.mergeLiveOrder(result.order)
      const receiptData = {
        ...orderData,
        id: result.order.id,
        paymentMode: 'A regler en caisse',
        estimatedPrepMinutes: Number(result.order.estimatedPrepMinutes || 0) || null,
      }
      ctx.setLastOrder(receiptData)

      // Déclenchement automatique de l'impression physique du ticket
      try {
        ctx.onAlert({
          title: 'Impression',
          message: "Bon de commande en cours d'impression...",
          type: 'info',
        })
        await printReceiptClient(receiptData)
      } catch (err) {
        console.error("Erreur lors de l'impression automatique du bon de commande:", err)
      }

      ctx.setShowReceipt(true)
      ctx.clearCart()
      ctx.advanceOrderId()
      ctx.onAfterCheckout()
      return
    }

    ctx.onAlert({ title: 'Commande non envoyee', message: result.error || "La commande n'a pas pu etre envoyee en cuisine." })
  } catch (error) {
    console.error('Server order failed, order queued for sync:', error)
    await queueServerOrder(ctx)
  }
}
