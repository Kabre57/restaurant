'use server'

import prisma from '@/lib/prisma'
import { getCached, redis, REDIS_KEYS } from '@/lib/redis'
import { 
  createProductSchema, 
  updateProductSchema, 
  adminCategorySchema, 
  updateCategorySchema,
  formatZodError 
} from '@/lib/validation/schemas'

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
    const parsed = createProductSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        price: validatedData.price,
        category: { connect: { id: validatedData.categoryId } },
        store: { connect: { id: validatedData.storeId } },
        image: validatedData.image,
        averagePrepTimeMins: validatedData.averagePrepTimeMins,
        trackStock: validatedData.trackStock,
        stockQuantity: validatedData.stockQuantity,
        minStockLevel: validatedData.minStockLevel
      }
    })
    
    // Invalidation du cache des produits du magasin
    await redis.del(REDIS_KEYS.products(validatedData.storeId))
    
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
    const parsed = updateProductSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const { categoryId, storeId, ...rest } = validatedData
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
      await redis.del(REDIS_KEYS.products(product.storeId))
      return { success: true, product }
    } catch (error: any) {
      if (error.message.includes('Unknown argument')) {
        // Fallback sans les champs problématiques (stock, storeId en scalaire)
        const { trackStock, stockQuantity, minStockLevel, ...safeData } = updateData
        const product = await prisma.product.update({
          where: { id },
          data: safeData
        })
        await redis.del(REDIS_KEYS.products(product.storeId))
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
    const product = await prisma.product.delete({
      where: { id }
    })
    await redis.del(REDIS_KEYS.products(product.storeId))
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
    return await getCached(REDIS_KEYS.products(storeId), 300, async () => {
      return await prisma.product.findMany({
        where: { storeId },
        include: { category: true },
        orderBy: { name: 'asc' }
      })
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
    const parsed = adminCategorySchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        store: { connect: { id: validatedData.storeId } },
        imageUrl: validatedData.imageUrl || null
      }
    })
    await redis.del(REDIS_KEYS.products(validatedData.storeId))
    return { success: true, category }
  } catch (error) {
    console.error("Failed to create category:", error)
    return { success: false, error: "Erreur lors de la création de la catégorie" }
  }
}

export async function updateCategory(id: string, data: { name?: string, imageUrl?: string }) {
  try {
    const parsed = updateCategorySchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const category = await prisma.category.update({
      where: { id },
      data: validatedData
    })
    await redis.del(REDIS_KEYS.products(category.storeId))
    return { success: true, category }
  } catch (error) {
    console.error("Failed to update category:", error)
    return { success: false, error: "Erreur lors de la mise à jour: " + (error as any).message }
  }
}

export async function deleteCategory(id: string) {
  try {
    const category = await prisma.category.delete({
      where: { id }
    })
    await redis.del(REDIS_KEYS.products(category.storeId))
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete category:", error)
    if (error.code === 'P2003') {
      return { success: false, error: "Impossible de supprimer cette catégorie car elle contient des produits." }
    }
    return { success: false, error: "Erreur lors de la suppression" }
  }
}
