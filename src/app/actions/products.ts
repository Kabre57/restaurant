'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function createProduct(data: { name: string, price: number, categoryId: string, storeId: string, image?: string }) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
        storeId: data.storeId,
        image: data.image
      }
    })
    return { success: true, product }
  } catch (error) {
    console.error("Failed to create product:", error)
    return { success: false, error: "Erreur lors de la création du produit" }
  }
}

export async function updateProduct(id: string, data: { name?: string, price?: number, categoryId?: string, image?: string, isAvailable?: boolean }) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data
    })
    return { success: true, product }
  } catch (error) {
    console.error("Failed to update product:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to delete product:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

export async function getProductsByStore(storeId: string) {
  try {
    return await prisma.product.findMany({
      where: { storeId },
      include: { category: true },
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return []
  }
}

export async function getCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return []
  }
}

export async function getCategoriesByStore(storeId: string) {
  try {
    return await prisma.category.findMany({
      where: { storeId },
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return []
  }
}
