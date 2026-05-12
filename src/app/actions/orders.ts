'use server'

import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@prisma/client'
import { redis } from '@/lib/redis'
import prisma from '@/lib/prisma'

const orderInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  },
  payments: true,
  table: true
}

type OrderInput = {
  clientRequestId?: string
  storeId: string
  cashierId?: string
  total: number
  type: OrderType
  paymentMode?: PaymentMethod | string
  items: {
    productId: string
    quantity: number
    price: number
    options?: string
  }[]
  tableId?: string
  promotionId?: string
  discount?: number
  customerId?: string
}

function normalizePaymentMethod(method?: PaymentMethod | string): PaymentMethod {
  if (method === PaymentMethod.CB || method === 'CARTE') return PaymentMethod.CB
  if (method === PaymentMethod.MOBILE_MONEY || method === 'MOBILE') return PaymentMethod.MOBILE_MONEY
  return PaymentMethod.ESPECES
}

function normalizeOrderStatus(status: OrderStatus | string): OrderStatus {
  if (status === 'PRÉPARATION' || status === OrderStatus.PREPARATION) return OrderStatus.PREPARATION
  if (status === 'PRÊT' || status === OrderStatus.PRET) return OrderStatus.PRET
  if (status === OrderStatus.COMPLETED) return OrderStatus.COMPLETED
  if (status === OrderStatus.CANCELLED) return OrderStatus.CANCELLED
  return OrderStatus.EN_ATTENTE
}

async function publishStockAlert(storeId: string, product: { name: string, stockQuantity: number }) {
  try {
    await redis.publish(`store:${storeId}:stock-alert`, JSON.stringify(product))
  } catch (error) {
    console.error("Failed to publish stock alert:", error)
  }
}

async function publishOrderEvent(eventName: 'new-order' | 'order-updated', order: { storeId?: string }) {
  if (!order.storeId) return

  try {
    await redis.publish(`store:${order.storeId}:orders:${eventName}`, JSON.stringify(order))
  } catch (error) {
    console.error(`Failed to publish ${eventName} to KDS:`, error)
  }
}

export async function createOrder(data: OrderInput) {
  try {
    if (!data.items.length) {
      return { success: false, error: "La commande ne contient aucun article" }
    }

    if (data.clientRequestId) {
      const existingOrder = await prisma.order.findUnique({
        where: { clientRequestId: data.clientRequestId },
        include: orderInclude
      })

      if (existingOrder) {
        if (existingOrder.storeId !== data.storeId || existingOrder.cashierId !== data.cashierId) {
          return { success: false, error: "Identifiant de synchronisation invalide" }
        }

        return { success: true, order: existingOrder, replayed: true }
      }
    }

    const productIds = [...new Set(data.items.map(item => item.productId))]
    const availableProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: data.storeId,
        isAvailable: true
      },
      select: { id: true }
    })

    if (availableProducts.length !== productIds.length) {
      return { success: false, error: "Un ou plusieurs produits ne sont plus disponibles" }
    }

    const paymentMethod = normalizePaymentMethod(data.paymentMode)

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          clientRequestId: data.clientRequestId,
          storeId: data.storeId,
          cashierId: data.cashierId,
          tableId: data.tableId,
          total: data.total,
          type: data.type,
          status: OrderStatus.EN_ATTENTE,
          promotionId: data.promotionId,
          discount: data.discount || 0,
          customerId: data.customerId,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              options: item.options
            }))
          },
          payments: {
            create: {
              method: paymentMethod,
              status: PaymentStatus.REUSSIE,
              amount: data.total
            }
          }
        },
        include: orderInclude
      })

      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, trackStock: true, stockQuantity: true, minStockLevel: true }
        })

        if (product?.trackStock) {
          const newQuantity = Math.max(0, product.stockQuantity - item.quantity)
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newQuantity }
          })

          if (newQuantity < product.minStockLevel) {
            await publishStockAlert(data.storeId, { name: product.name, stockQuantity: newQuantity })
          }
        }
      }

      // Increment promotion usage
      if (data.promotionId) {
        await tx.promotion.update({
          where: { id: data.promotionId },
          data: { usedCount: { increment: 1 } }
        })
      }

      return newOrder
    })

    await publishOrderEvent('new-order', order)

    return { success: true, order };
  } catch (error) {
    console.error("Failed to create order:", error)
    return { success: false, error: "Erreur lors de la création de la commande" }
  }
}

export async function addItemsToOrder(orderId: string, items: OrderInput['items'], addedTotal: number) {
  try {
    if (!items.length) {
      return { success: false, error: "Aucun article à ajouter" }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return { success: false, error: "Commande introuvable" }
    }

    // Déterminer le nouveau statut. Si la commande était PRÊTE ou TERMINÉE, on la repasse en attente/prépa.
    const newStatus = order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED
      ? OrderStatus.EN_ATTENTE
      : order.status

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.update({
        where: { id: orderId },
        data: {
          total: { increment: addedTotal },
          status: newStatus,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              options: item.options
            }))
          }
        },
        include: orderInclude
      })

      // Deduct stocks
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, trackStock: true, stockQuantity: true, minStockLevel: true }
        })

        if (product?.trackStock) {
          const newQuantity = Math.max(0, product.stockQuantity - item.quantity)
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newQuantity }
          })

          if (newQuantity < product.minStockLevel) {
            await publishStockAlert(order.storeId, { name: product.name, stockQuantity: newQuantity })
          }
        }
      }

      return orderUpdate
    })

    // S'il y a un paiement en attente, on met à jour son montant.
    const pendingPayment = await prisma.payment.findFirst({
      where: { orderId: orderId, status: PaymentStatus.EN_ATTENTE }
    })

    if (pendingPayment) {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: { amount: { increment: addedTotal } }
      })
    }

    await publishOrderEvent('order-updated', updatedOrder)

    return { success: true, order: updatedOrder }
  } catch (error) {
    console.error("Failed to add items to order:", error)
    return { success: false, error: "Erreur lors de l'ajout des articles" }
  }
}

export async function syncOrdersBatch(orders: OrderInput[]) {
  const batch = orders.slice(0, 10)
  const results = []

  for (const order of batch) {
    results.push(await createOrder(order))
  }

  return results
}

export async function getActiveOrders(storeId: string) {
  try {
    return await prisma.order.findMany({
      where: {
        storeId,
        status: {
          in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET]
        }
      },
      include: orderInclude,
      orderBy: {
        createdAt: 'asc'
      }
    })
  } catch (error) {
    console.error("Failed to fetch active orders:", error)
    return []
  }
}

export async function getStoreOrders(storeId: string) {
  try {
    return await prisma.order.findMany({
      where: { storeId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 for performance
    })
  } catch (error) {
    console.error("Failed to fetch store orders:", error)
    return []
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus | string, storeId?: string) {
  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { storeId: true }
    })

    if (!existingOrder) {
      return { success: false, error: "Commande introuvable" }
    }

    if (storeId && existingOrder.storeId !== storeId) {
      return { success: false, error: "Commande hors périmètre restaurant" }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: normalizeOrderStatus(status) },
      include: orderInclude
    });

    await publishOrderEvent('order-updated', order)

    return { success: true, order };
  } catch (error) {
    console.error("Failed to update order status:", error)
    return { success: false, error: "Erreur lors de la mise à jour du statut" }
  }
}
