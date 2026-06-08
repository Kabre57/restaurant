'use server'

import { prisma } from '@/lib/db'
import { OrderStatus, DeliveryStatus } from '@prisma/client'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export async function getDeliveryPeople(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  const targetStoreId = role === "ADMIN" ? (storeId || authStoreId) : authStoreId

  try {
    return await prisma.deliveryPerson.findMany({
      where: targetStoreId ? { storeId: targetStoreId } : undefined,
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch delivery people:", error)
    return []
  }
}

export async function createDeliveryPerson(data: { name: string, phone: string, vehicleType?: string, storeId?: string }) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const targetStoreId = role === "ADMIN" ? (data.storeId || authStoreId) : authStoreId

  if (!targetStoreId) {
    return { success: false, error: "Store ID est requis." }
  }

  try {
    const person = await prisma.deliveryPerson.create({
      data: {
        name: data.name,
        phone: data.phone,
        vehicleType: data.vehicleType,
        storeId: targetStoreId
      }
    })
    return { success: true, person }
  } catch (error) {
    console.error("Failed to create delivery person:", error)
    return { success: false, error: "Erreur lors de la création du livreur" }
  }
}

export async function assignDelivery(orderId: string, deliveryPersonId: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } })
    if (!existingOrder) return { success: false, error: "Commande introuvable" }
    if (role !== "ADMIN") {
      assertSameStore(existingOrder.storeId, authStoreId)
    }

    const deliveryPerson = await prisma.deliveryPerson.findUnique({ where: { id: deliveryPersonId } })
    if (!deliveryPerson) return { success: false, error: "Livreur introuvable" }
    if (role !== "ADMIN") {
      assertSameStore(deliveryPerson.storeId, authStoreId)
    }

    if (existingOrder.storeId !== deliveryPerson.storeId) {
      return { success: false, error: "Le livreur et la commande doivent appartenir au même restaurant." }
    }

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
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const deliveryPerson = await prisma.deliveryPerson.findUnique({ where: { id: deliveryPersonId } })
    if (!deliveryPerson) return { success: false, error: "Livreur introuvable" }
    if (role !== "ADMIN") {
      assertSameStore(deliveryPerson.storeId, authStoreId)
    }

    await prisma.deliveryPerson.update({
      where: { id: deliveryPersonId },
      data: { status }
    })
    return { success: true }
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour du statut" }
  }
}

export async function getOrdersForDelivery(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await prisma.order.findMany({
      where: { 
        storeId: targetStoreId, 
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
