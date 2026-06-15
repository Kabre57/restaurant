import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client'
import { computeEstimatedPrepMinutes } from '@/lib/prep-estimates'
import { DEFAULT_VAT_RATE, computeTaxFromNetAmount } from '@/lib/tax'
import { telemetry } from '@/shared/telemetry'
import { handleLoyaltyPoints } from './order-fidelity.service'
import { deductStockForItems, orderInclude, buildEstimatedReadyAt } from './order-persistence.service'

/**
 * Tente de fusionner une commande dine-in si une commande active existe déjà sur la table spécifiée.
 * L'accès à la table est sérialisé via un verrouillage de ligne.
 */
export async function tryMergeDineInOrder(
  tx: Prisma.TransactionClient,
  data: {
    storeId: string
    tableId?: string
    items: { productId: string; quantity: number; options?: string }[]
    discount?: number
    customerId?: string
    loyaltyPointsRedeemed?: number
    promotionId?: string
  },
  productPriceMap: Map<string, number>,
  availableProducts: { id: string; name: string; trackStock: boolean; stockQuantity: number; minStockLevel: number; averagePrepTimeMins: number }[],
  paymentMethodId: string,
  paymentStatus: PaymentStatus,
  userId: string
) {
  if (!data.tableId) return null

  // 1. Verrouiller la table pour éviter les conditions de concurrence
  await tx.table.update({
    where: { id: data.tableId },
    data: { updatedAt: new Date() }
  })

  // 2. Chercher une commande active sur cette table
  const existingActiveOrder = await tx.order.findFirst({
    where: {
      tableId: data.tableId,
      storeId: data.storeId,
      status: {
        in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET]
      }
    },
    include: orderInclude
  })

  if (!existingActiveOrder) return null

  // Calculer le total à ajouter
  const addedTotal = data.items.reduce((acc, i) => {
    const serverPrice = productPriceMap.get(i.productId) ?? 0
    const lineTotal = serverPrice * i.quantity
    return acc + computeTaxFromNetAmount(lineTotal).totalIncludingTax
  }, 0)

  // Mettre à jour la commande principale et insérer les nouveaux articles
  const orderUpdate = await tx.order.update({
    where: { id: existingActiveOrder.id },
    data: {
      total: { increment: addedTotal },
      status: OrderStatus.EN_ATTENTE,
      actualPrepMinutes: null,
      preparationStartedAt: null,
      readyAt: null,
      servedAt: null,
      items: {
        create: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: productPriceMap.get(item.productId) ?? 0,
          priceExcludingTax: productPriceMap.get(item.productId) ?? 0,
          taxRate: DEFAULT_VAT_RATE,
          taxAmount: computeTaxFromNetAmount((productPriceMap.get(item.productId) ?? 0) * item.quantity).taxAmount,
          options: item.options
        }))
      }
    },
    include: orderInclude
  })

  const newEstimatedPrepMinutes = computeEstimatedPrepMinutes(
    orderUpdate.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    orderUpdate.items.map((item) => ({
      id: item.productId,
      averagePrepTimeMins: item.product.averagePrepTimeMins,
    }))
  )

  const orderWithEstimate = await tx.order.update({
    where: { id: existingActiveOrder.id },
    data: {
      estimatedPrepMinutes: newEstimatedPrepMinutes,
      estimatedReadyAt: buildEstimatedReadyAt(newEstimatedPrepMinutes),
    },
    include: orderInclude
  })

  // Déduire les stocks pour les nouveaux articles
  await deductStockForItems(tx, data.storeId, data.items, availableProducts, existingActiveOrder.id)

  if (data.promotionId) {
    await tx.promotion.update({
      where: { id: data.promotionId },
      data: { usedCount: { increment: 1 } }
    })
  }

  // Mettre à jour ou créer la ligne de paiement
  const pendingPayment = await tx.payment.findFirst({
    where: { orderId: existingActiveOrder.id, status: PaymentStatus.EN_ATTENTE }
  })

  if (pendingPayment) {
    await tx.payment.update({
      where: { id: pendingPayment.id },
      data: { amount: { increment: addedTotal } }
    })
  } else {
    await tx.payment.create({
      data: {
        orderId: existingActiveOrder.id,
        paymentMethodId: paymentMethodId,
        status: paymentStatus,
        amount: addedTotal,
      }
    })
  }

  // Gérer la fidélisation
  if (paymentStatus === PaymentStatus.REUSSIE && data.customerId) {
    await handleLoyaltyPoints(tx, existingActiveOrder.id, data.customerId, addedTotal, data.loyaltyPointsRedeemed, false)
  }

  // Enregistrer la fusion dans les pistes d'audit
  telemetry.logAudit({
    storeId: data.storeId,
    userId: userId,
    action: 'ORDER_MERGED',
    description: `Fusion automatique de commande sur la table #${data.tableId}. Commande mise à jour : #${existingActiveOrder.id}.`,
    details: {
      orderId: existingActiveOrder.id,
      tableId: data.tableId,
      addedTotal
    }
  })

  return orderWithEstimate
}
