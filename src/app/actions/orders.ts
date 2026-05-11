'use server'

import { PrismaClient, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@prisma/client'
import { redis } from '@/lib/redis'

const prisma = new PrismaClient()

const orderInclude = {
  items: {
    include: {
      product: true
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

    const order = await prisma.order.create({
      data: {
        clientRequestId: data.clientRequestId,
        storeId: data.storeId,
        cashierId: data.cashierId,
        tableId: data.tableId,
        total: data.total,
        type: data.type,
        status: OrderStatus.EN_ATTENTE,
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
            status: PaymentStatus.EN_ATTENTE, // Default to EN_ATTENTE for customer orders
            amount: data.total
          }
        }
      },
      include: orderInclude
    });

    await publishOrderEvent('new-order', order)

    return { success: true, order };
  } catch (error) {
    console.error("Failed to create order:", error)
    return { success: false, error: "Erreur lors de la création de la commande" }
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
