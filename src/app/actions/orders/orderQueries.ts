'use server'

import { OrderStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getCached, REDIS_KEYS } from '@/lib/redis'
import { telemetry } from '@/shared/telemetry'
import {
  orderInclude,
  normalizeOrderStatus,
  buildEstimatedReadyAt,
  updateProductPrepAveragesFromOrder,
} from '@/services/order'
import { notifyOrderReady, notifyOrderUpdated } from '@/services/order'

export async function getActiveOrders(storeId: string) {
  try {
    return await prisma.order.findMany({
      where: {
        storeId,
        status: { in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET] },
      },
      include: orderInclude,
      orderBy: { createdAt: 'asc' },
    })
  } catch (error) {
    console.error('Failed to fetch active orders:', error)
    return []
  }
}

export async function getStoreOrders(storeId: string) {
  try {
    return await getCached(REDIS_KEYS.stats(storeId), 300, async () => {
      return prisma.order.findMany({
        where: { storeId },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    })
  } catch (error) {
    console.error('Failed to fetch store orders:', error)
    return []
  }
}

function parseClientUpdatedAt(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Règle LWW: si le serveur possède déjà une mise à jour plus récente que celle du KDS,
 * la version serveur l'emporte et l'action locale devient un conflit audité.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus | string,
  storeId?: string,
  clientUpdatedAt?: string
) {
  try {
    const nextStatus = normalizeOrderStatus(status)
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        storeId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        estimatedPrepMinutes: true,
        preparationStartedAt: true,
      },
    })

    if (!existingOrder) return { success: false, error: 'Commande introuvable' }
    if (storeId && existingOrder.storeId !== storeId) {
      return { success: false, error: 'Commande hors périmètre restaurant' }
    }

    const clientDate = parseClientUpdatedAt(clientUpdatedAt)
    if (clientDate && existingOrder.updatedAt.getTime() > clientDate.getTime()) {
      const currentOrder = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude })
      telemetry.logAudit({
        storeId: existingOrder.storeId,
        userId: 'system',
        action: 'STATUS_CONFLICT',
        description: 'Conflit LWW KDS: le statut serveur plus récent est conservé.',
        details: {
          orderId,
          requestedStatus: nextStatus,
          serverStatus: existingOrder.status,
          clientUpdatedAt,
          serverUpdatedAt: existingOrder.updatedAt.toISOString(),
        },
      })
      return { success: true, order: currentOrder, conflict: 'STATUS_CONFLICT' as const }
    }

    const now = new Date()
    const order = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.OrderUpdateInput = { status: nextStatus }

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
          include: orderInclude,
        })
        await updateProductPrepAveragesFromOrder(tx, orderId, actualPrepMinutes)
        return updatedReadyOrder
      }

      if (nextStatus === OrderStatus.COMPLETED) updateData.servedAt = now

      return tx.order.update({ where: { id: orderId }, data: updateData, include: orderInclude })
    })

    if (order.status === OrderStatus.PRET) await notifyOrderReady(order)
    else await notifyOrderUpdated(order)

    return { success: true, order }
  } catch (error) {
    console.error('Failed to update order status:', error)
    return { success: false, error: 'Erreur lors de la mise à jour du statut' }
  }
}

import { publishPOSOrderAlert } from './orderNotifications'

export async function triggerReadyOrderBip(orderId: string, storeId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true }
    })
    if (!order) return { success: false, error: 'Commande introuvable' }
    
    await publishPOSOrderAlert('ORDER_READY', {
      id: order.id,
      storeId: order.storeId,
      table: order.table ? { number: order.table.number } : null,
      total: order.total,
    })
    
    return { success: true }
  } catch (error) {
    console.error("Error triggering ready order bip:", error)
    return { success: false, error: String(error) }
  }
}

