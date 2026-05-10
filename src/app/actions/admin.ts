'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

/**
 * Bascule la disponibilité d'un produit (disponible / en rupture).
 * Revalide le chemin du back-office et du POS pour que les changements soient immédiats.
 */
export async function toggleProductAvailability(productId: string, isAvailable: boolean) {
  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { isAvailable },
    })
    revalidatePath('/admin/produits')
    revalidatePath('/')
    return { success: true, product }
  } catch (error) {
    console.error("Erreur lors du changement de disponibilité:", error)
    return { success: false, error: "Impossible de mettre à jour le produit." }
  }
}

/**
 * Met à jour le prix d'un produit (en FCFA).
 */
export async function updateProductPrice(productId: string, price: number) {
  try {
    if (price <= 0) return { success: false, error: "Le prix doit être supérieur à 0." }
    const product = await prisma.product.update({
      where: { id: productId },
      data: { price },
    })
    revalidatePath('/admin/produits')
    revalidatePath('/')
    return { success: true, product }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du prix:", error)
    return { success: false, error: "Impossible de mettre à jour le prix." }
  }
}

/**
 * Récupère tous les produits avec leur catégorie pour le back-office.
 */
export async function getProductsForAdmin() {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      include: { category: true },
    })
    return products
  } catch (error) {
    console.error("Impossible de récupérer les produits:", error)
    return []
  }
}
