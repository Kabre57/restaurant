'use server'

import { prisma } from '@/lib/db'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export async function validatePromotion(
  code: string,
  storeId: string,
  currentTotal: number,
  items?: { productId: string; price: number; quantity: number }[]
) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  if (role !== "ADMIN") {
    assertSameStore(storeId, authStoreId)
  }

  try {
    const promo = await prisma.promotion.findFirst({
      where: { code: code.trim().toUpperCase(), storeId, isActive: true },
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

    // 1. Validation de la plage horaire (Happy Hour)
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (promo.startTime && promo.endTime) {
      if (currentTimeStr < promo.startTime || currentTimeStr > promo.endTime) {
        return { success: false, error: `Ce code promo est uniquement valide de ${promo.startTime} à ${promo.endTime}` }
      }
    }

    // 2. Validation des jours de la semaine
    const currentDay = now.getDay()
    if (promo.daysOfWeek && promo.daysOfWeek.length > 0) {
      if (!promo.daysOfWeek.includes(currentDay)) {
        const daysNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
        const validDays = promo.daysOfWeek.map(d => daysNames[d]).join(', ')
        return { success: false, error: `Ce code promo est uniquement valide les jours suivants : ${validDays}` }
      }
    }

    // 3. Montant d'achat minimum
    if (promo.minOrderAmount > 0 && currentTotal < promo.minOrderAmount) {
      return { success: false, error: `Ce code nécessite un montant minimum de ${promo.minOrderAmount} FCFA` }
    }

    // 4. Ciblage spécifique (produit ou catégorie)
    let baseAmountForDiscount = currentTotal
    if (promo.applicableTo === "PRODUCT") {
      if (!items || items.length === 0) {
        return { success: false, error: "Les articles du panier sont requis pour appliquer cette promotion ciblée." }
      }
      baseAmountForDiscount = items
        .filter(i => i.productId === promo.applicableId)
        .reduce((sum, i) => sum + i.price * i.quantity, 0)
      
      if (baseAmountForDiscount <= 0) {
        return { success: false, error: "Ce code promo n'est pas applicable aux produits de votre panier." }
      }
    } else if (promo.applicableTo === "CATEGORY") {
      if (!items || items.length === 0) {
        return { success: false, error: "Les articles du panier sont requis pour appliquer cette promotion ciblée." }
      }
      const productIds = items.map(i => i.productId)
      const productsInCart = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, categoryId: true }
      })
      const matchingProductIds = productsInCart
        .filter(p => p.categoryId === promo.applicableId)
        .map(p => p.id)
      baseAmountForDiscount = items
        .filter(i => matchingProductIds.includes(i.productId))
        .reduce((sum, i) => sum + i.price * i.quantity, 0)

      if (baseAmountForDiscount <= 0) {
        return { success: false, error: "Ce code promo n'est pas applicable aux catégories de produits dans votre panier." }
      }
    }

    let discount = 0
    if (promo.discountType === 'PERCENTAGE') {
      discount = (baseAmountForDiscount * promo.value) / 100
    } else {
      discount = promo.value
    }

    if (promo.maxDiscount !== null && promo.maxDiscount !== undefined && discount > promo.maxDiscount) {
      discount = promo.maxDiscount
    }

    discount = Math.min(Math.max(Math.round(discount), 0), currentTotal)

    return { success: true, discount, promoId: promo.id }
  } catch (error) {
    console.error('Failed to validate promo:', error)
    return { success: false, error: 'Erreur lors de la validation' }
  }
}

/**
 * Recherche un client par téléphone ou nom.
 */
export async function searchCustomer(query: string, storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  const targetStoreId = role === "ADMIN" ? (storeId || authStoreId) : authStoreId

  try {
    return await prisma.customer.findMany({
      where: {
        storeId: targetStoreId,
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
  await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  return creditLoyaltyPoints(customerId, orderTotal)
}

// ─── Nouvelles fonctions fidélité (Sprint 3.2) ────────────────────────────────

/**
 * Retourne le résumé du programme de fidélité d'un client.
 * Calcule le prochain palier de récompense (tous les 100 points).
 */
export async function getLoyaltySummary(customerId: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const loyalty = await prisma.loyalty.findUnique({
      where: { customerId },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true, storeId: true } },
      },
    })

    if (!loyalty) return null
    if (role !== "ADMIN") {
      assertSameStore(loyalty.customer.storeId, authStoreId)
    }

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
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyalty: true }
    })
    if (!customer) return { success: false, pointsAdded: 0 }
    if (role !== "ADMIN") {
      assertSameStore(customer.storeId, authStoreId)
    }

    const multiplier = customer.loyalty?.pointsMultiplier ?? 1.0
    const pointsToAdd = Math.floor((orderTotal / 100) * multiplier)
    if (pointsToAdd <= 0) return { success: true, pointsAdded: 0 }

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
 * Crédite les points de fidélité pour une commande spécifique en vérifiant que les points ne sont pas déjà crédités.
 */
export async function creditLoyaltyPointsForOrder(orderId: string, tx?: any) {
  const client = tx || prisma

  try {
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { loyalty: true } } }
    })

    if (!order || !order.customerId || !order.customer) {
      return { success: false, reason: "Aucun client associé à la commande" }
    }

    if (order.loyaltyPointsEarned > 0) {
      return { success: false, reason: "Points déjà crédités pour cette commande" }
    }

    const loyalty = order.customer.loyalty
    const multiplier = loyalty?.pointsMultiplier ?? 1.0
    const pointsToAdd = Math.floor((order.total / 100) * multiplier)

    if (pointsToAdd <= 0) {
      return { success: true, pointsAdded: 0 }
    }

    await client.loyalty.upsert({
      where: { customerId: order.customerId },
      update: { points: { increment: pointsToAdd } },
      create: { customerId: order.customerId, points: pointsToAdd, pointsMultiplier: multiplier },
    })

    await client.order.update({
      where: { id: orderId },
      data: { loyaltyPointsEarned: pointsToAdd }
    })

    return { success: true, pointsAdded: pointsToAdd }
  } catch (error) {
    console.error('[Loyalty] creditLoyaltyPointsForOrder failed:', error)
    return { success: false, error: "Impossible de créditer les points" }
  }
}

/**
 * Débite des points (rachat / récompense).
 * Retourne une erreur si solde insuffisant.
 */
export async function redeemLoyaltyPoints(customerId: string, points: number) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return { success: false, error: 'Client introuvable' }
    if (role !== "ADMIN") {
      assertSameStore(customer.storeId, authStoreId)
    }

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
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return []
    if (role !== "ADMIN") {
      assertSameStore(customer.storeId, authStoreId)
    }

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




