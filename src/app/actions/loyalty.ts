'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Valide un code promo et retourne le montant de la remise.
 */
export async function validatePromotion(code: string, storeId: string, currentTotal: number) {
  try {
    const promo = await prisma.promotion.findFirst({
      where: { 
        code, 
        storeId, 
        isActive: true 
      },
    })

    if (!promo) {
      return { success: false, error: "Code promo invalide ou expiré" }
    }

    // Vérifier les dates
    const now = new Date()
    if (promo.startDate && promo.startDate > now) return { success: false, error: "Promotion pas encore active" }
    if (promo.endDate && promo.endDate < now) return { success: false, error: "Promotion expirée" }

    // Vérifier la limite d'utilisation
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
    console.error("Failed to validate promo:", error)
    return { success: false, error: "Erreur lors de la validation" }
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
      take: 5
    })
  } catch (error) {
    return []
  }
}

/**
 * Crée ou met à jour le compte fidélité après un achat.
 */
export async function processLoyaltyPoints(customerId: string, orderTotal: number) {
  try {
    // Règle simple : 1 point par 1000 FCFA dépensés
    const pointsToAdd = Math.floor(orderTotal / 1000)

    await prisma.loyalty.upsert({
      where: { customerId },
      update: { points: { increment: pointsToAdd } },
      create: { customerId, points: pointsToAdd }
    })

    return { success: true, pointsAdded: pointsToAdd }
  } catch (error) {
    return { success: false, error: "Erreur fidélité" }
  }
}
