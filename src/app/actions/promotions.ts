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
