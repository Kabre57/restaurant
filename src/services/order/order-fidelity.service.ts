import { creditLoyaltyPointsForOrder } from '@/app/actions/clients/loyalty'
import { Prisma } from '@prisma/client'

/**
 * Gère le calcul et l'attribution/déduction des points de fidélité pour un client.
 * Supporte le nouveau schéma LoyaltyCustomer et l'ancien fallback global.
 */
export async function handleLoyaltyPoints(
  tx: Prisma.TransactionClient,
  orderId: string,
  customerId: string,
  amount: number,
  redeemedPoints?: number,
  isNewOrder = true
): Promise<void> {
  const lc = await tx.loyaltyCustomer.findUnique({
    where: { id: customerId }
  })

  if (lc) {
    const pointsToEarn = Math.floor(amount / 100)
    if (pointsToEarn > 0) {
      await tx.loyaltyCustomer.update({
        where: { id: customerId },
        data: { points: { increment: pointsToEarn } }
      })
      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          orderId,
          type: 'EARN',
          points: pointsToEarn,
          description: `Points accumulés sur la commande #${orderId.slice(-6).toUpperCase()}`
        }
      })
      await tx.order.update({
        where: { id: orderId },
        data: {
          loyaltyPointsEarned: isNewOrder ? pointsToEarn : { increment: pointsToEarn },
          loyaltyPointsRedeemed: isNewOrder ? (redeemedPoints || 0) : { increment: redeemedPoints || 0 }
        }
      })
    }
    if (redeemedPoints && redeemedPoints > 0) {
      await tx.loyaltyCustomer.update({
        where: { id: customerId },
        data: { points: { decrement: redeemedPoints } }
      })
      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          orderId,
          type: 'REDEEM',
          points: -redeemedPoints,
          description: `Points rachetés sur la commande #${orderId.slice(-6).toUpperCase()}`
        }
      })
      if (!pointsToEarn || pointsToEarn <= 0) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            loyaltyPointsRedeemed: isNewOrder ? redeemedPoints : { increment: redeemedPoints }
          }
        })
      }
    }
  } else {
    await creditLoyaltyPointsForOrder(orderId, tx)
    if (redeemedPoints && redeemedPoints > 0) {
      await tx.loyalty.update({
        where: { customerId },
        data: { points: { decrement: redeemedPoints } }
      })
    }
  }
}
