import { prisma } from '@/lib/db'
import { PaymentType, PaymentStatus, OrderStatus, Prisma } from '@prisma/client'
import { decrementIngredientInventory } from '@/app/actions/inventory/inventory'
import { publishStockAlert } from '@/app/actions/orders/orderNotifications'

export const orderInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  },
  payments: {
    include: {
      paymentMethod: true
    }
  },
  table: true
}

/**
 * Résout l'identifiant d'une méthode de paiement à partir d'un code ou d'un nom de méthode.
 * Crée la méthode par défaut si elle n'existe pas pour ce magasin.
 */
export async function resolvePaymentMethodId(storeId: string, methodCodeOrId?: string): Promise<string> {
  const methodCode = methodCodeOrId?.trim()

  if (methodCode) {
    const methodById = await prisma.paymentMethod.findUnique({
      where: { id: methodCode }
    }).catch(() => null)
    if (methodById && (methodById.storeId === storeId || methodById.storeId === null)) return methodById.id

    const storeMethodByName = await prisma.paymentMethod.findFirst({
      where: { storeId, name: { equals: methodCode, mode: 'insensitive' } }
    })
    if (storeMethodByName) return storeMethodByName.id

    const globalMethodByName = await prisma.paymentMethod.findFirst({
      where: { storeId: null, name: { equals: methodCode, mode: 'insensitive' } }
    })
    if (globalMethodByName) return globalMethodByName.id
  }

  const normalizedCode = (methodCode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  let type: PaymentType = 'CASH'
  if (normalizedCode.includes('CARTE') || normalizedCode.includes('CARD') || normalizedCode === 'CB' || normalizedCode.includes('VISA')) {
    type = 'CARD'
  }
  if (normalizedCode.includes('MOBILE') || normalizedCode.includes('MONEY') || normalizedCode.includes('ORANGE') || normalizedCode.includes('WAVE') || normalizedCode.includes('MTN')) {
    type = 'MOBILE_MONEY'
  }

  let pm = await prisma.paymentMethod.findFirst({
    where: { storeId, type }
  })
  
  if (!pm) {
    pm = await prisma.paymentMethod.findFirst({
      where: { storeId: null, type }
    })
  }

  if (!pm) {
    pm = await prisma.paymentMethod.create({
      data: { name: type === 'CASH' ? 'Espèces' : type, type, storeId, isDefault: true }
    })
  }

  return pm.id
}

/**
 * Normalise le statut d'un paiement en valeur enum PaymentStatus.
 */
export function normalizePaymentStatus(status?: PaymentStatus | string): PaymentStatus {
  if (status === PaymentStatus.EN_ATTENTE || status === 'EN_ATTENTE') return PaymentStatus.EN_ATTENTE
  if (status === PaymentStatus.ECHOUEE || status === 'ECHOUEE') return PaymentStatus.ECHOUEE
  if (status === PaymentStatus.REMBOURSEE || status === 'REMBOURSEE') return PaymentStatus.REMBOURSEE
  return PaymentStatus.REUSSIE
}

/**
 * Normalise le statut d'une commande en valeur enum OrderStatus.
 */
export function normalizeOrderStatus(status: OrderStatus | string): OrderStatus {
  if (status === 'PRÉPARATION' || status === OrderStatus.PREPARATION) return OrderStatus.PREPARATION
  if (status === 'PRÊT' || status === OrderStatus.PRET) return OrderStatus.PRET
  if (status === OrderStatus.COMPLETED) return OrderStatus.COMPLETED
  if (status === OrderStatus.CANCELLED) return OrderStatus.CANCELLED
  return OrderStatus.EN_ATTENTE
}

/**
 * Calcule la date prévisionnelle de finalisation de la commande.
 */
export function buildEstimatedReadyAt(prepMinutes: number, baseDate = new Date()) {
  return new Date(baseDate.getTime() + prepMinutes * 60_000)
}

/**
 * Met à jour les moyennes historiques de temps de préparation des produits associés à la commande.
 */
export async function updateProductPrepAveragesFromOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  actualPrepMinutes: number
): Promise<void> {
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

/**
 * Déduit les stocks physiques et ingrédients pour la liste des produits commandés.
 */
export async function deductStockForItems(
  tx: Prisma.TransactionClient,
  storeId: string,
  items: { productId: string; quantity: number }[],
  availableProducts: { id: string; name: string; trackStock: boolean; stockQuantity: number; minStockLevel: number }[],
  referenceOrderId: string
): Promise<void> {
  const productMap = new Map(availableProducts.map(p => [p.id, p]))

  for (const item of items) {
    const product = productMap.get(item.productId)

    // Déduction en cascade des ingrédients
    await decrementIngredientInventory(tx, storeId, item.productId, item.quantity)

    if (product && product.trackStock) {
      const newQuantity = Math.max(0, product.stockQuantity - item.quantity)
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: newQuantity }
      })

      // Enregistrement du mouvement de stock
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          storeId,
          quantity: -item.quantity,
          reason: 'SALE',
          referenceId: referenceOrderId,
        }
      })

      if (newQuantity < product.minStockLevel) {
        await publishStockAlert(storeId, { name: product.name, stockQuantity: newQuantity })
      }
    }
  }
}
