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

export async function getCategories() {
  try {
    return await prisma.category.findMany({ orderBy: { name: 'asc' } })
  } catch (error) {
    return []
  }
}

export async function addProduct(data: { name: string, price: number, categoryId: string, image: string | null, storeId: string }) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
        image: data.image, // Mock S3/Upload: storage as Base64 or URL
        storeId: data.storeId,
        isAvailable: true
      },
      include: { category: true }
    })
    revalidatePath('/admin/produits')
    revalidatePath('/')
    return { success: true, product }
  } catch (error) {
    console.error("Erreur creation produit:", error)
    return { success: false, error: "Erreur lors de l'ajout." }
  }
}
