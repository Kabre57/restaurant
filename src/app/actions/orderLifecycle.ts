'use server'

import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { publishOrderEvent } from './orderNotifications'

const orderInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  },
  payments: true,
  table: true,
}

function normalizePaymentMethod(method?: PaymentMethod | string): PaymentMethod {
  if (method === PaymentMethod.CB || method === 'CARTE') return PaymentMethod.CB
  if (method === PaymentMethod.MOBILE_MONEY || method === 'MOBILE') return PaymentMethod.MOBILE_MONEY
  return PaymentMethod.ESPECES
}

export async function settleOrderPayment(orderId: string, paymentMode: PaymentMethod | string, storeId?: string) {
  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude })

    if (!existingOrder) return { success: false, error: 'Commande introuvable' }
    if (storeId && existingOrder.storeId !== storeId) return { success: false, error: 'Commande hors périmètre restaurant' }
    if (existingOrder.status === OrderStatus.CANCELLED) {
      return { success: false, error: 'Cette commande a ete annulee et ne peut plus etre encaissee' }
    }

    const paymentMethod = normalizePaymentMethod(paymentMode)
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const pendingPayment = await tx.payment.findFirst({
        where: { orderId, status: PaymentStatus.EN_ATTENTE },
        orderBy: { createdAt: 'asc' },
      })

      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: { method: paymentMethod, status: PaymentStatus.REUSSIE, amount: existingOrder.total },
        })
      } else {
        await tx.payment.create({
          data: { orderId, method: paymentMethod, status: PaymentStatus.REUSSIE, amount: existingOrder.total },
        })
      }

      return tx.order.findUnique({ where: { id: orderId }, include: orderInclude })
    })

    if (!updatedOrder) return { success: false, error: 'Commande introuvable apres encaissement' }

    if (existingOrder.servedAt && updatedOrder.status !== OrderStatus.COMPLETED) {
      const completedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED },
        include: orderInclude,
      })

      await publishOrderEvent('order-updated', completedOrder)
      return { success: true, order: completedOrder }
    }

    await publishOrderEvent('order-updated', updatedOrder)
    return { success: true, order: updatedOrder }
  } catch (error) {
    console.error('Failed to settle order payment:', error)
    return { success: false, error: "Erreur lors de l'encaissement de la commande" }
  }
}

export async function markOrderServed(orderId: string, storeId?: string) {
  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude })

    if (!existingOrder) return { success: false, error: 'Commande introuvable' }
    if (storeId && existingOrder.storeId !== storeId) return { success: false, error: 'Commande hors périmètre restaurant' }
    if (existingOrder.status !== OrderStatus.PRET) {
      return { success: false, error: 'Seule une commande prête peut être marquée servie' }
    }

    const hasPendingPayment = existingOrder.payments.some((payment) => payment.status === PaymentStatus.EN_ATTENTE)
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        servedAt: existingOrder.servedAt || new Date(),
        status: hasPendingPayment ? OrderStatus.PRET : OrderStatus.COMPLETED,
      },
      include: orderInclude,
    })

    await publishOrderEvent('order-updated', order)
    return { success: true, order, hasPendingPayment }
  } catch (error) {
    console.error('Failed to mark order served:', error)
    return { success: false, error: 'Impossible de marquer cette commande comme servie' }
  }
}
