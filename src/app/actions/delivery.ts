'use server'

import prisma from '@/lib/prisma'
import { OrderStatus, DeliveryStatus } from '@prisma/client'

export async function getDeliveryPeople() {
  try {
    return await prisma.deliveryPerson.findMany({
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch delivery people:", error)
    return []
  }
}

export async function createDeliveryPerson(data: { name: string, phone: string, vehicleType?: string }) {
  try {
    const person = await prisma.deliveryPerson.create({
      data
    })
    return { success: true, person }
  } catch (error) {
    console.error("Failed to create delivery person:", error)
    return { success: false, error: "Erreur lors de la création du livreur" }
  }
}

export async function assignDelivery(orderId: string, deliveryPersonId: string) {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPersonId,
        status: OrderStatus.PRET // Assuming it's ready when assigned or moving to delivery
      }
    })

    // Also update delivery person status
    await prisma.deliveryPerson.update({
      where: { id: deliveryPersonId },
      data: { status: DeliveryStatus.BUSY }
    })

    return { success: true, order }
  } catch (error) {
    console.error("Failed to assign delivery:", error)
    return { success: false, error: "Erreur lors de l'assignation" }
  }
}

export async function updateDeliveryStatus(deliveryPersonId: string, status: DeliveryStatus) {
  try {
    await prisma.deliveryPerson.update({
      where: { id: deliveryPersonId },
      data: { status }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: "Erreur lors de la mise à jour du statut" }
  }
}

export async function getOrdersForDelivery(storeId: string) {
  try {
    return await prisma.order.findMany({
      where: { 
        storeId, 
        type: 'DELIVERY',
        status: { in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET] }
      },
      include: {
        deliveryPerson: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error("Failed to fetch delivery orders:", error)
    return []
  }
}
