'use server'

import prisma from '@/lib/prisma'


/**
 * Valide un code promo et retourne le montant de la remise.
 */
export async function validatePromotion(code: string, storeId: string, currentTotal: number) {
  try {
    const promo = await prisma.promotion.findFirst({
      where: { code, storeId, isActive: true },
    })

    if (!promo) {
      return { success: false, error: 'Code promo invalide ou expiré' }
    }

    const now = new Date()
    if (promo.startDate && promo.startDate > now) return { success: false, error: 'Promotion pas encore active' }
    if (promo.endDate && promo.endDate < now) return { success: false, error: 'Promotion expirée' }
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return { success: false, error: "Limite d'utilisation atteinte" }
    }

    let discount = 0
    if (promo.discountType === 'PERCENTAGE') {
      discount = (currentTotal * promo.value) / 100
    } else {
      discount = Math.min(promo.value, currentTotal)
    }

    return { success: true, discount, promoId: promo.id }
  } catch (error) {
    console.error('Failed to validate promo:', error)
    return { success: false, error: 'Erreur lors de la validation' }
  }
}

/**
 * Recherche un client par téléphone ou nom.
 */
export async function searchCustomer(query: string) {
  try {
    return await prisma.customer.findMany({
      where: {
        OR: [
          { phone: { contains: query } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { loyalty: true },
      take: 5,
    })
  } catch {
    return []
  }
}

/**
 * Crée ou met à jour le compte fidélité après un achat.
 * Règle : 1 point par 100 FCFA dépensés.
 */
export async function processLoyaltyPoints(customerId: string, orderTotal: number) {
  return creditLoyaltyPoints(customerId, orderTotal)
}

// ─── Nouvelles fonctions fidélité (Sprint 3.2) ────────────────────────────────

/**
 * Retourne le résumé du programme de fidélité d'un client.
 * Calcule le prochain palier de récompense (tous les 100 points).
 */
export async function getLoyaltySummary(customerId: string) {
  try {
    const loyalty = await prisma.loyalty.findUnique({
      where: { customerId },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
      },
    })

    if (!loyalty) return null

    const nextThreshold = Math.ceil((loyalty.points + 1) / 100) * 100

    return {
      customerId,
      customerName: `${loyalty.customer.firstName} ${loyalty.customer.lastName}`,
      phone: loyalty.customer.phone,
      points: loyalty.points,
      nextRewardAt: nextThreshold,
      pointsToNextReward: nextThreshold - loyalty.points,
    }
  } catch {
    return null
  }
}

/**
 * Crédite des points (1 point par 100 FCFA dépensés).
 * Appelé automatiquement après chaque commande complétée.
 */
export async function creditLoyaltyPoints(customerId: string, orderTotal: number) {
  const pointsToAdd = Math.floor(orderTotal / 100)
  if (pointsToAdd <= 0) return { success: true, pointsAdded: 0 }

  try {
    const loyalty = await prisma.loyalty.upsert({
      where: { customerId },
      update: { points: { increment: pointsToAdd } },
      create: { customerId, points: pointsToAdd },
    })

    return {
      success: true,
      pointsAdded: pointsToAdd,
      totalPoints: loyalty.points,
    }
  } catch (error) {
    console.error('[Loyalty] creditLoyaltyPoints failed:', error)
    return { success: false, pointsAdded: 0 }
  }
}

/**
 * Débite des points (rachat / récompense).
 * Retourne une erreur si solde insuffisant.
 */
export async function redeemLoyaltyPoints(customerId: string, points: number) {
  try {
    const loyalty = await prisma.loyalty.findUnique({ where: { customerId } })

    if (!loyalty || loyalty.points < points) {
      return {
        success: false,
        error: `Points insuffisants (disponibles : ${loyalty?.points ?? 0})`,
      }
    }

    const updated = await prisma.loyalty.update({
      where: { customerId },
      data: { points: { decrement: points } },
    })

    return { success: true, remainingPoints: updated.points }
  } catch (error) {
    console.error('[Loyalty] redeemLoyaltyPoints failed:', error)
    return { success: false, error: 'Erreur lors du débit des points' }
  }
}

/**
 * Historique des N dernières commandes avec points gagnés.
 */
export async function getLoyaltyHistory(customerId: string, limit = 10) {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        total: true,
        createdAt: true,
        items: {
          select: { quantity: true, product: { select: { name: true } } },
        },
      },
    })

    return orders.map((order) => ({
      orderId: order.id,
      date: order.createdAt,
      total: order.total,
      pointsEarned: Math.floor(order.total / 100),
      items: order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', '),
    }))
  } catch {
    return []
  }
}




