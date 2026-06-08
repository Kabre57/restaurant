'use server'

import { prisma } from '@/lib/db'
import { DiscountType } from '@prisma/client'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'

export async function getPromotions(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId
  const where = targetStoreId ? { storeId: targetStoreId } : {}

  try {
    return await prisma.promotion.findMany({
      where,
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
  minOrderAmount?: number
  maxDiscount?: number
  applicableTo?: string
  applicableId?: string
  startTime?: string
  endTime?: string
  daysOfWeek?: number[]
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  if (!finalStoreId) {
    return { success: false, error: "Restaurant cible requis." }
  }

  try {
    if (data.applicableTo === "CATEGORY" && data.applicableId) {
      const category = await prisma.category.findUnique({
        where: { id: data.applicableId },
        select: { storeId: true },
      })
      if (!category) return { success: false, error: "Catégorie cible introuvable." }
      assertSameStore(category.storeId, finalStoreId, "Catégorie")
    }

    if (data.applicableTo === "PRODUCT" && data.applicableId) {
      const product = await prisma.product.findUnique({
        where: { id: data.applicableId },
        select: { storeId: true },
      })
      if (!product) return { success: false, error: "Produit cible introuvable." }
      assertSameStore(product.storeId, finalStoreId, "Produit")
    }

    const promotion = await prisma.promotion.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        value: data.value,
        store: { connect: { id: finalStoreId } },
        startDate: data.startDate,
        endDate: data.endDate,
        usageLimit: data.usageLimit,
        minOrderAmount: data.minOrderAmount || 0,
        maxDiscount: data.maxDiscount,
        applicableTo: data.applicableTo || "ALL",
        applicableId: data.applicableId,
        startTime: data.startTime,
        endTime: data.endTime,
        daysOfWeek: data.daysOfWeek || [],
      }
    })
    revalidatePath('/admin/promotions')
    revalidatePath('/restaurateur/reductions')
    return { success: true, promotion }
  } catch (error) {
    console.error("Failed to create promotion:", error)
    return { success: false, error: "Erreur lors de la création de la promotion" }
  }
}

export async function deletePromotion(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.promotion.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Promotion non trouvée" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await prisma.promotion.delete({
      where: { id }
    })
    revalidatePath('/admin/promotions')
    revalidatePath('/restaurateur/reductions')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete promotion:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

export async function togglePromotionStatus(id: string, isActive: boolean) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.promotion.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Promotion non trouvée" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: { isActive }
    })
    revalidatePath('/admin/promotions')
    revalidatePath('/restaurateur/reductions')
    return { success: true, promotion }
  } catch (error) {
    console.error("Failed to toggle promotion status:", error)
    return { success: false, error: "Erreur lors de la modification du statut" }
  }
}

export async function verifyPromoCode(
  code: string,
  storeId: string,
  subtotal: number,
  items?: { productId: string; price: number; quantity: number }[]
) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    const normalizedCode = code.trim().toUpperCase()

    if (!normalizedCode) {
      return { success: false, error: 'Code promotionnel requis' }
    }

    const promotion = await prisma.promotion.findFirst({
      where: {
        code: normalizedCode,
        storeId: targetStoreId,
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

    // 1. Validation de la plage horaire (Happy Hour)
    const now = new Date()
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (promotion.startTime && promotion.endTime) {
      if (currentTimeStr < promotion.startTime || currentTimeStr > promotion.endTime) {
        return { success: false, error: `Ce code promo est uniquement valide de ${promotion.startTime} à ${promotion.endTime}` }
      }
    }

    // 2. Validation des jours de la semaine
    const currentDay = now.getDay()
    if (promotion.daysOfWeek && promotion.daysOfWeek.length > 0) {
      if (!promotion.daysOfWeek.includes(currentDay)) {
        const daysNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
        const validDays = promotion.daysOfWeek.map(d => daysNames[d]).join(', ')
        return { success: false, error: `Ce code promo est uniquement valide les jours suivants : ${validDays}` }
      }
    }

    // 3. Montant d'achat minimum
    if (promotion.minOrderAmount > 0 && subtotal < promotion.minOrderAmount) {
      return { success: false, error: `Ce code nécessite un montant minimum de ${promotion.minOrderAmount} FCFA` }
    }

    // 4. Ciblage spécifique (produit ou catégorie)
    let baseAmountForDiscount = subtotal
    if (promotion.applicableTo === "PRODUCT") {
      if (!items || items.length === 0) {
        return { success: false, error: "Les articles du panier sont requis pour appliquer cette promotion ciblée." }
      }
      baseAmountForDiscount = items
        .filter(i => i.productId === promotion.applicableId)
        .reduce((sum, i) => sum + i.price * i.quantity, 0)
      
      if (baseAmountForDiscount <= 0) {
        return { success: false, error: "Ce code promo n'est pas applicable aux produits de votre panier." }
      }
    } else if (promotion.applicableTo === "CATEGORY") {
      if (!items || items.length === 0) {
        return { success: false, error: "Les articles du panier sont requis pour appliquer cette promotion ciblée." }
      }
      const productIds = items.map(i => i.productId)
      const productsInCart = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, categoryId: true }
      })
      const matchingProductIds = productsInCart
        .filter(p => p.categoryId === promotion.applicableId)
        .map(p => p.id)
      baseAmountForDiscount = items
        .filter(i => matchingProductIds.includes(i.productId))
        .reduce((sum, i) => sum + i.price * i.quantity, 0)

      if (baseAmountForDiscount <= 0) {
        return { success: false, error: "Ce code promo n'est pas applicable aux catégories de produits dans votre panier." }
      }
    }

    let rawDiscount = promotion.discountType === DiscountType.PERCENTAGE
      ? baseAmountForDiscount * (promotion.value / 100)
      : promotion.value

    if (promotion.maxDiscount !== null && promotion.maxDiscount !== undefined && rawDiscount > promotion.maxDiscount) {
      rawDiscount = promotion.maxDiscount
    }

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
