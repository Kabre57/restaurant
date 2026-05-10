'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    return categories
  } catch (error) {
    console.error("Impossible de récupérer les catégories:", error)
    return []
  }
}

export async function getProducts(categoryId?: string) {
  try {
    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        category: true,
      }
    })
    return products
  } catch (error) {
    console.error("Impossible de récupérer les produits:", error)
    return []
  }
}
