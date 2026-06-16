'use server'

import { DeliveryStatus, OrderStatus, OrderType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth, requirePermission, requireStoreAccess } from '@/shared/security'

type DeliveryActionUser = Awaited<ReturnType<typeof requireAuth>>

type DeliveryContext = {
  user: DeliveryActionUser
  targetStoreId: string
}

function toSecurityUser(user: DeliveryActionUser) {
  return {
    id: user.id,
    role: user.role,
    storeId: user.storeId,
  }
}

async function resolveDeliveryContext(storeId?: string): Promise<DeliveryContext> {
  const user = await requireAuth()
  const targetStoreId = storeId ?? user.storeId

  if (!targetStoreId) {
    throw new Error('Store ID est requis.')
  }

  requireStoreAccess(toSecurityUser(user), targetStoreId)

  return { user, targetStoreId }
}

export async function getDeliveryPeople(storeId?: string) {
  const { user, targetStoreId } = await resolveDeliveryContext(storeId)
  await requirePermission(toSecurityUser(user), 'delivery.driver_assign')

  try {
    return await prisma.deliveryPerson.findMany({
      where: { storeId: targetStoreId },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Failed to fetch delivery people:', error)
    return []
  }
}

export async function createDeliveryPerson(data: {
  name: string
  phone: string
  vehicleType?: string
  storeId?: string
}) {
  const { user, targetStoreId } = await resolveDeliveryContext(data.storeId)
  await requirePermission(toSecurityUser(user), 'delivery.settings')

  try {
    const person = await prisma.deliveryPerson.create({
      data: {
        name: data.name,
        phone: data.phone,
        vehicleType: data.vehicleType,
        storeId: targetStoreId,
      },
    })

    return { success: true, person }
  } catch (error) {
    console.error('Failed to create delivery person:', error)
    return { success: false, error: "Erreur lors de la création du livreur" }
  }
}

export async function assignDelivery(orderId: string, deliveryPersonId: string) {
  const user = await requireAuth()
  await requirePermission(toSecurityUser(user), 'delivery.driver_assign')

  try {
    const assignableStatuses: OrderStatus[] = [
      OrderStatus.EN_ATTENTE,
      OrderStatus.PREPARATION,
      OrderStatus.PRET,
    ]

    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } })
    if (!existingOrder) return { success: false, error: 'Commande introuvable' }

    requireStoreAccess(toSecurityUser(user), existingOrder.storeId)

    if (existingOrder.type !== OrderType.DELIVERY) {
      return { success: false, error: "Cette commande n'est pas une livraison." }
    }

    if (!assignableStatuses.includes(existingOrder.status)) {
      return { success: false, error: "La commande n'est pas dans un état compatible avec l'assignation." }
    }

    const deliveryPerson = await prisma.deliveryPerson.findUnique({ where: { id: deliveryPersonId } })
    if (!deliveryPerson) return { success: false, error: 'Livreur introuvable' }

    requireStoreAccess(toSecurityUser(user), deliveryPerson.storeId)

    if (existingOrder.storeId !== deliveryPerson.storeId) {
      return { success: false, error: 'Le livreur et la commande doivent appartenir au même restaurant.' }
    }

    if (deliveryPerson.status !== DeliveryStatus.ONLINE) {
      return { success: false, error: 'Le livreur doit être en ligne pour recevoir une course.' }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPersonId,
        status: OrderStatus.PRET,
      },
    })

    await prisma.deliveryPerson.update({
      where: { id: deliveryPersonId },
      data: { status: DeliveryStatus.BUSY },
    })

    return { success: true, order }
  } catch (error) {
    console.error('Failed to assign delivery:', error)
    return { success: false, error: "Erreur lors de l'assignation" }
  }
}

export async function updateDeliveryStatus(deliveryPersonId: string, status: DeliveryStatus) {
  const user = await requireAuth()
  await requirePermission(toSecurityUser(user), 'delivery.settings')

  try {
    const deliveryPerson = await prisma.deliveryPerson.findUnique({ where: { id: deliveryPersonId } })
    if (!deliveryPerson) return { success: false, error: 'Livreur introuvable' }

    requireStoreAccess(toSecurityUser(user), deliveryPerson.storeId)

    await prisma.deliveryPerson.update({
      where: { id: deliveryPersonId },
      data: { status },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Erreur lors de la mise à jour du statut' }
  }
}

export async function getOrdersForDelivery(storeId: string) {
  const { user, targetStoreId } = await resolveDeliveryContext(storeId)
  await requirePermission(toSecurityUser(user), 'delivery.orders_view')

  try {
    return await prisma.order.findMany({
      where: {
        storeId: targetStoreId,
        type: OrderType.DELIVERY,
        status: { in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET] },
      },
      include: {
        deliveryPerson: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Failed to fetch delivery orders:', error)
    return []
  }
}
