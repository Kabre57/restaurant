'use server'

import { OrderStatus, OrderType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client'
import { redis } from '@/lib/redis'
import prisma from '@/lib/prisma'
import { computeEstimatedPrepMinutes } from '@/lib/prep-estimates'

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
  paymentStatus?: PaymentStatus | string
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
  externalPayload?: Prisma.InputJsonValue
}

function normalizePaymentMethod(method?: PaymentMethod | string): PaymentMethod {
  if (method === PaymentMethod.CB || method === 'CARTE') return PaymentMethod.CB
  if (method === PaymentMethod.MOBILE_MONEY || method === 'MOBILE') return PaymentMethod.MOBILE_MONEY
  return PaymentMethod.ESPECES
}

function normalizePaymentStatus(status?: PaymentStatus | string): PaymentStatus {
  if (status === PaymentStatus.EN_ATTENTE || status === 'EN_ATTENTE') return PaymentStatus.EN_ATTENTE
  if (status === PaymentStatus.ECHOUEE || status === 'ECHOUEE') return PaymentStatus.ECHOUEE
  if (status === PaymentStatus.REMBOURSEE || status === 'REMBOURSEE') return PaymentStatus.REMBOURSEE
  return PaymentStatus.REUSSIE
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

function buildEstimatedReadyAt(prepMinutes: number, baseDate = new Date()) {
  return new Date(baseDate.getTime() + prepMinutes * 60_000)
}

async function updateProductPrepAveragesFromOrder(tx: Prisma.TransactionClient, orderId: string, actualPrepMinutes: number) {
  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true },
    distinct: ['productId']
  })

  for (const item of orderItems) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { averagePrepTimeMins: true, prepTimeSamples: true }
    })

    if (!product) continue

    const nextSamples = product.prepTimeSamples + 1
    const nextAverage = Math.max(
      1,
      Math.round(((product.averagePrepTimeMins * product.prepTimeSamples) + actualPrepMinutes) / nextSamples)
    )

    await tx.product.update({
      where: { id: item.productId },
      data: {
        averagePrepTimeMins: nextAverage,
        prepTimeSamples: nextSamples,
      }
    })
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
      select: {
        id: true,
        name: true,
        averagePrepTimeMins: true,
        trackStock: true,
        stockQuantity: true,
        minStockLevel: true
      }
    })

    if (availableProducts.length !== productIds.length) {
      return { success: false, error: "Un ou plusieurs produits ne sont plus disponibles" }
    }

    const paymentMethod = normalizePaymentMethod(data.paymentMode)
    const paymentStatus = normalizePaymentStatus(data.paymentStatus)
    const estimatedPrepMinutes = computeEstimatedPrepMinutes(data.items, availableProducts)
    const estimatedReadyAt = buildEstimatedReadyAt(estimatedPrepMinutes)

    const order = await prisma.$transaction(async (tx) => {
      const productMap = new Map(availableProducts.map((product) => [product.id, product]))

      // Construction dynamique pour contourner les problèmes de synchronisation du client Prisma
      const orderCreateData: Prisma.OrderUncheckedCreateInput = {
        clientRequestId: data.clientRequestId || null,
        storeId: data.storeId,
        cashierId: data.cashierId || null,
        tableId: data.tableId || null,
        total: data.total,
        type: data.type,
        status: OrderStatus.EN_ATTENTE,
        estimatedPrepMinutes,
        estimatedReadyAt,
        externalPayload: data.externalPayload ?? Prisma.JsonNull,
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
            status: paymentStatus,
            amount: data.total
          }
        }
      }

      const createOrderRecord = async () => {
        try {
          return await tx.order.create({
            data: {
              ...orderCreateData,
              discount: data.discount || 0,
              promotionId: data.promotionId || null,
              customerId: data.customerId || null,
            },
            include: orderInclude
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          if (message.includes('Unknown argument')) {
            console.warn("Fallback creation order: some fields are not supported by the current client")
            return tx.order.create({
              data: orderCreateData,
              include: orderInclude
            })
          }

          throw error
        }
      }

      const newOrder = await createOrderRecord()

      for (const item of data.items) {
        const product = productMap.get(item.productId)

        if (!product || !product.trackStock) {
          continue
        }

        const newQuantity = Math.max(0, product.stockQuantity - item.quantity)
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newQuantity }
        })

        if (newQuantity < product.minStockLevel) {
          await publishStockAlert(data.storeId, { name: product.name, stockQuantity: newQuantity })
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
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, error: "Erreur lors de la création de la commande: " + errorMessage }
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

    // Si la commande etait deja terminee ou marquee prete, on la repasse en attente.
    const newStatus = order.status === OrderStatus.PRET || order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED
      ? OrderStatus.EN_ATTENTE
      : order.status

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.update({
        where: { id: orderId },
        data: {
          total: { increment: addedTotal },
          status: newStatus,
          actualPrepMinutes: null,
          preparationStartedAt: newStatus === OrderStatus.EN_ATTENTE ? null : order.preparationStartedAt,
          readyAt: null,
          servedAt: null,
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

      const estimatedPrepMinutes = computeEstimatedPrepMinutes(
        orderUpdate.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        orderUpdate.items.map((item) => ({
          id: item.productId,
          averagePrepTimeMins: item.product.averagePrepTimeMins,
        }))
      )

      const estimateBase = newStatus === OrderStatus.PREPARATION && order.preparationStartedAt
        ? new Date(order.preparationStartedAt)
        : new Date()

      const orderWithEstimate = await tx.order.update({
        where: { id: orderId },
        data: {
          estimatedPrepMinutes,
          estimatedReadyAt: buildEstimatedReadyAt(estimatedPrepMinutes, estimateBase),
        },
        include: orderInclude
      })

      // Deduct stocks
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            trackStock: true,
            stockQuantity: true,
            minStockLevel: true
          }
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

      return orderWithEstimate
    })

    // S'il y a un paiement en attente, on met à jour son montant.
    // Sinon, on ouvre une nouvelle ligne de paiement en attente pour les extras.
    const pendingPayment = await prisma.payment.findFirst({
      where: { orderId: orderId, status: PaymentStatus.EN_ATTENTE }
    })

    if (pendingPayment) {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: { amount: { increment: addedTotal } }
      })
    } else {
      const paidPaymentCount = await prisma.payment.count({
        where: {
          orderId,
          status: PaymentStatus.REUSSIE,
        }
      })

      if (paidPaymentCount > 0) {
        await prisma.payment.create({
          data: {
            orderId,
            method: PaymentMethod.ESPECES,
            status: PaymentStatus.EN_ATTENTE,
            amount: addedTotal,
          }
        })
      }
    }

    await publishOrderEvent('order-updated', updatedOrder)

    return { success: true, order: updatedOrder }
  } catch (error) {
    console.error("Failed to add items to order:", error)
    return { success: false, error: "Erreur lors de l'ajout des articles" }
  }
}

export async function settleOrderPayment(orderId: string, paymentMode: PaymentMethod | string, storeId?: string) {
  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    })

    if (!existingOrder) {
      return { success: false, error: 'Commande introuvable' }
    }

    if (storeId && existingOrder.storeId !== storeId) {
      return { success: false, error: 'Commande hors périmètre restaurant' }
    }

    if (existingOrder.status === OrderStatus.CANCELLED) {
      return { success: false, error: 'Cette commande a ete annulee et ne peut plus etre encaissee' }
    }

    const paymentMethod = normalizePaymentMethod(paymentMode)

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const pendingPayment = await tx.payment.findFirst({
        where: {
          orderId,
          status: PaymentStatus.EN_ATTENTE,
        },
        orderBy: {
          createdAt: 'asc',
        }
      })

      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            method: paymentMethod,
            status: PaymentStatus.REUSSIE,
            amount: existingOrder.total,
          }
        })
      } else {
        await tx.payment.create({
          data: {
            orderId,
            method: paymentMethod,
            status: PaymentStatus.REUSSIE,
            amount: existingOrder.total,
          }
        })
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
      })
    })

    if (!updatedOrder) {
      return { success: false, error: 'Commande introuvable apres encaissement' }
    }

    await publishOrderEvent('order-updated', updatedOrder)

    return { success: true, order: updatedOrder }
  } catch (error) {
    console.error('Failed to settle order payment:', error)
    return { success: false, error: "Erreur lors de l'encaissement de la commande" }
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
    const nextStatus = normalizeOrderStatus(status)
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        storeId: true,
        status: true,
        createdAt: true,
        estimatedPrepMinutes: true,
        preparationStartedAt: true,
      }
    })

    if (!existingOrder) {
      return { success: false, error: "Commande introuvable" }
    }

    if (storeId && existingOrder.storeId !== storeId) {
      return { success: false, error: "Commande hors périmètre restaurant" }
    }

    const now = new Date()

    const order = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.OrderUpdateInput = {
        status: nextStatus,
      }

      if (nextStatus === OrderStatus.PREPARATION) {
        const prepStart = existingOrder.preparationStartedAt || now
        updateData.preparationStartedAt = prepStart
        if (existingOrder.estimatedPrepMinutes) {
          updateData.estimatedReadyAt = buildEstimatedReadyAt(existingOrder.estimatedPrepMinutes, prepStart)
        }
      }

      if (nextStatus === OrderStatus.PRET) {
        const prepStart = existingOrder.preparationStartedAt || existingOrder.createdAt
        const actualPrepMinutes = Math.max(1, Math.round((now.getTime() - prepStart.getTime()) / 60_000))

        updateData.readyAt = now
        updateData.actualPrepMinutes = actualPrepMinutes

        const updatedReadyOrder = await tx.order.update({
          where: { id: orderId },
          data: updateData,
          include: orderInclude
        })

        await updateProductPrepAveragesFromOrder(tx, orderId, actualPrepMinutes)
        return updatedReadyOrder
      }

      if (nextStatus === OrderStatus.COMPLETED) {
        updateData.servedAt = now
      }

      return tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: orderInclude
      })
    })

    await publishOrderEvent('order-updated', order)

    return { success: true, order };
  } catch (error) {
    console.error("Failed to update order status:", error)
    return { success: false, error: "Erreur lors de la mise à jour du statut" }
  }
}
