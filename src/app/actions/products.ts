'use server'

import prisma from '@/lib/prisma'

export async function createProduct(data: { 
  name: string, 
  price: number, 
  categoryId: string, 
  storeId: string, 
  image?: string,
  averagePrepTimeMins?: number,
  trackStock?: boolean,
  stockQuantity?: number,
  minStockLevel?: number
}) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        category: { connect: { id: data.categoryId } },
        store: { connect: { id: data.storeId } },
        image: data.image,
        averagePrepTimeMins: data.averagePrepTimeMins,
        trackStock: data.trackStock,
        stockQuantity: data.stockQuantity,
        minStockLevel: data.minStockLevel
      }
    })
    return { success: true, product }
  } catch (error) {
    console.error("Failed to create product:", error)
    return { success: false, error: "Erreur lors de la création du produit" }
  }
}

export async function updateProduct(id: string, data: { 
  name?: string, 
  price?: number, 
  categoryId?: string, 
  image?: string, 
  averagePrepTimeMins?: number,
  isAvailable?: boolean,
  trackStock?: boolean,
  stockQuantity?: number,
  minStockLevel?: number,
  storeId?: string
}) {
  try {
    const { categoryId, storeId, ...rest } = data
    const updateData: any = {
      ...rest,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      ...(storeId ? { store: { connect: { id: storeId } } } : {})
    }

    try {
      const product = await prisma.product.update({
        where: { id },
        data: updateData
      })
      return { success: true, product }
    } catch (error: any) {
      if (error.message.includes('Unknown argument')) {
        // Fallback sans les champs problématiques (stock, storeId en scalaire)
        const { trackStock, stockQuantity, minStockLevel, ...safeData } = updateData
        const product = await prisma.product.update({
          where: { id },
          data: safeData
        })
        return { success: true, product }
      }
      throw error
    }
  } catch (error) {
    console.error("Failed to update product:", error)
    return { success: false, error: "Erreur lors de la mise à jour: " + (error as any).message }
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id }
    })
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete product:", error)
    if (error.code === 'P2003') {
      return { success: false, error: "Impossible de supprimer ce produit car il est présent dans l'historique des commandes. Rendez-le 'Épuisé' à la place." }
    }
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

export async function getCategories(storeId?: string) {
  try {
    const where = storeId ? { storeId } : {}
    return await prisma.category.findMany({
      where,
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

export async function createCategory(data: { name: string, storeId: string, imageUrl?: string }) {
  try {
    const category = await prisma.category.create({
      data: {
        name: data.name,
        store: { connect: { id: data.storeId } },
        imageUrl: data.imageUrl
      }
    })
    return { success: true, category }
  } catch (error) {
    console.error("Failed to create category:", error)
    return { success: false, error: "Erreur lors de la création de la catégorie" }
  }
}

export async function updateCategory(id: string, data: { name?: string, imageUrl?: string }) {
  try {
    const category = await prisma.category.update({
      where: { id },
      data
    })
    return { success: true, category }
  } catch (error) {
    console.error("Failed to update category:", error)
    return { success: false, error: "Erreur lors de la mise à jour: " + (error as any).message }
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.category.delete({
      where: { id }
    })
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete category:", error)
    if (error.code === 'P2003') {
      return { success: false, error: "Impossible de supprimer cette catégorie car elle contient des produits." }
    }
    return { success: false, error: "Erreur lors de la suppression" }
  }
}
