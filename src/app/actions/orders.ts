'use server'

import { PrismaClient, OrderStatus, OrderType } from '@prisma/client'
import { redis } from '@/lib/redis'

const prisma = new PrismaClient()

type OrderInput = {
  storeId: string
  cashierId: string
  total: number
  type: OrderType
  items: {
    productId: string
    quantity: number
    price: number
    options?: string
  }[]
}

export async function createOrder(data: OrderInput) {
  try {
    const order = await prisma.order.create({
      data: {
        storeId: data.storeId,
        cashierId: data.cashierId,
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
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Publish to Redis for KDS (Kitchen Display System)
    await redis.publish('new-order', JSON.stringify(order));

    return { success: true, order };
  } catch (error) {
    console.error("Failed to create order:", error)
    return { success: false, error: "Erreur lors de la création de la commande" }
  }
}

export async function getActiveOrders(storeId: string) {
  try {
    return await prisma.order.findMany({
      where: {
        storeId,
        status: {
          in: [OrderStatus.EN_ATTENTE, OrderStatus.PRÉPARATION, OrderStatus.PRÊT]
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
  } catch (error) {
    console.error("Failed to fetch active orders:", error)
    return []
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { product: true } } }
    });

    // Informer les clients que le statut de leur commande a changé
    await redis.publish('order-updated', JSON.stringify(order));

    return { success: true, order };
  } catch (error) {
    console.error("Failed to update order status:", error)
    return { success: false, error: "Erreur lors de la mise à jour du statut" }
  }
}
