'use server'

import prisma from '@/lib/prisma'
import { DiscountType } from '@prisma/client'

export async function getPromotions() {
  try {
    return await prisma.promotion.findMany({
      include: { store: true },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error("Failed to fetch promotions:", error)
    return []
  }
}

export async function createPromotion(data: {
  code: string
  discountType: DiscountType
  value: number
  storeId: string
  startDate?: Date
  endDate?: Date
  usageLimit?: number
}) {
  try {
    const promotion = await prisma.promotion.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        value: data.value,
        store: { connect: { id: data.storeId } },
        startDate: data.startDate,
        endDate: data.endDate,
        usageLimit: data.usageLimit,
      }
    })
    return { success: true, promotion }
  } catch (error) {
    console.error("Failed to create promotion:", error)
    return { success: false, error: "Erreur lors de la création de la promotion" }
  }
}

export async function deletePromotion(id: string) {
  try {
    await prisma.promotion.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to delete promotion:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

export async function togglePromotionStatus(id: string, isActive: boolean) {
  try {
    const promotion = await prisma.promotion.update({
      where: { id },
      data: { isActive }
    })
    return { success: true, promotion }
  } catch (error) {
    console.error("Failed to toggle promotion status:", error)
    return { success: false, error: "Erreur lors de la modification du statut" }
  }
}

export async function verifyPromoCode(code: string, storeId: string, subtotal: number) {
  try {
    const normalizedCode = code.trim().toUpperCase()

    if (!normalizedCode) {
      return { success: false, error: 'Code promotionnel requis' }
    }

    const promotion = await prisma.promotion.findFirst({
      where: {
        code: normalizedCode,
        storeId,
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
      },
    })

    if (!promotion || (promotion.endDate && promotion.endDate < new Date())) {
      return { success: false, error: 'Code promotionnel invalide ou expiré' }
    }

    if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
      return { success: false, error: 'La limite d’utilisation de ce code est atteinte' }
    }

    const rawDiscount = promotion.discountType === DiscountType.PERCENTAGE
      ? subtotal * (promotion.value / 100)
      : promotion.value
    const discount = Math.min(Math.max(Math.round(rawDiscount), 0), subtotal)

    return {
      success: true,
      promotionId: promotion.id,
      code: promotion.code,
      discount,
      total: Math.max(0, subtotal - discount),
      description: promotion.description,
    }
  } catch (error) {
    console.error('Failed to verify promo code:', error)
    return { success: false, error: 'Impossible de valider le code promotionnel' }
  }
}
