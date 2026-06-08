'use server'

import { OrderStatus, PaymentStatus, PaymentType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { publishOrderEvent } from './orderNotifications'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'
import { creditLoyaltyPointsForOrder } from '../clients/loyalty'

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

async function resolvePaymentMethodId(storeId: string, methodCodeOrId?: string): Promise<string> {
  if (methodCodeOrId && methodCodeOrId.length > 20) {
    return methodCodeOrId;
  }
  
  let type: PaymentType = 'CASH';
  if (methodCodeOrId === 'CB' || methodCodeOrId === 'CARTE') type = 'CARD';
  if (methodCodeOrId === 'MOBILE_MONEY' || methodCodeOrId === 'MOBILE') type = 'MOBILE_MONEY';

  let pm = await prisma.paymentMethod.findFirst({
    where: { storeId, type }
  });
  
  if (!pm) {
    pm = await prisma.paymentMethod.findFirst({
      where: { storeId: null, type }
    });
  }

  if (!pm) {
    pm = await prisma.paymentMethod.create({
      data: { name: type === 'CASH' ? 'Espèces' : type, type, storeId, isDefault: true }
    });
  }

  return pm.id;
}

export async function settleOrderPayment(orderId: string, paymentMode: string, storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude })

    if (!existingOrder) return { success: false, error: 'Commande introuvable' }
    if (role !== "ADMIN") {
      assertSameStore(existingOrder.storeId, authStoreId)
    } else if (storeId && existingOrder.storeId !== storeId) {
      return { success: false, error: 'Commande hors périmètre restaurant' }
    }

    if (existingOrder.status === OrderStatus.CANCELLED) {
      return { success: false, error: 'Cette commande a ete annulee et ne peut plus etre encaissee' }
    }

    const paymentMethodId = await resolvePaymentMethodId(existingOrder.storeId, paymentMode)
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const pendingPayment = await tx.payment.findFirst({
        where: { orderId, status: PaymentStatus.EN_ATTENTE },
        orderBy: { createdAt: 'asc' },
      })

      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: { paymentMethodId: paymentMethodId, status: PaymentStatus.REUSSIE, amount: existingOrder.total },
        })
      } else {
        await tx.payment.create({
          data: { orderId, paymentMethodId: paymentMethodId, status: PaymentStatus.REUSSIE, amount: existingOrder.total },
        })
      }

      if (existingOrder.customerId) {
        await creditLoyaltyPointsForOrder(orderId, tx)
        if (existingOrder.loyaltyPointsRedeemed > 0) {
          await tx.loyalty.update({
            where: { customerId: existingOrder.customerId },
            data: { points: { decrement: existingOrder.loyaltyPointsRedeemed } }
          })
        }
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
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude })

    if (!existingOrder) return { success: false, error: 'Commande introuvable' }
    if (role !== "ADMIN") {
      assertSameStore(existingOrder.storeId, authStoreId)
    } else if (storeId && existingOrder.storeId !== storeId) {
      return { success: false, error: 'Commande hors périmètre restaurant' }
    }

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
