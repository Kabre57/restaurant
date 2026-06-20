'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getCached, redis, REDIS_KEYS } from '@/lib/redis'
import { 
  createProductSchema, 
  updateProductSchema, 
  adminCategorySchema, 
  updateCategorySchema,
  formatZodError 
} from '@/lib/validation/schemas'

import { requireAuth, assertSameStore } from '@/lib/auth-guard'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function createProduct(data: { 
  name: string, 
  price: number, 
  priceHT?: number,
  taxRate?: number,
  priceTTC?: number,
  categoryId: string, 
  storeId: string, 
  image?: string,
  averagePrepTimeMins?: number,
  trackStock?: boolean,
  stockQuantity?: number,
  minStockLevel?: number
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const parsed = createProductSchema.safeParse({ ...data, storeId: finalStoreId })
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const finalTtc = validatedData.priceTTC ?? validatedData.price
    const finalTaxRate = validatedData.taxRate ?? 18.00
    const finalHt = validatedData.priceHT ?? (finalTtc / (1 + finalTaxRate / 100))

    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        price: finalTtc,
        priceHT: finalHt,
        taxRate: finalTaxRate,
        priceTTC: finalTtc,
        category: { connect: { id: validatedData.categoryId } },
        store: { connect: { id: finalStoreId } },
        image: validatedData.image,
        averagePrepTimeMins: validatedData.averagePrepTimeMins,
        trackStock: validatedData.trackStock,
        stockQuantity: validatedData.stockQuantity,
        minStockLevel: validatedData.minStockLevel
      }
    })
    
    // Invalidation du cache des produits du magasin
    await redis.del(REDIS_KEYS.products(finalStoreId))
    
    return { success: true, product }
  } catch (error) {
    console.error("Failed to create product:", error)
    return { success: false, error: "Erreur lors de la création du produit" }
  }
}

export async function updateProduct(id: string, data: { 
  name?: string, 
  price?: number, 
  priceHT?: number,
  taxRate?: number,
  priceTTC?: number,
  categoryId?: string, 
  image?: string, 
  averagePrepTimeMins?: number,
  isAvailable?: boolean,
  trackStock?: boolean,
  stockQuantity?: number,
  minStockLevel?: number,
  storeId?: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Produit non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId, "Produit")
    }

    const parsed = updateProductSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const { categoryId, storeId, ...rest } = validatedData
    const finalStoreId = role === "ADMIN" ? (storeId || existing.storeId) : authStoreId

    let finalTtc = validatedData.priceTTC ?? validatedData.price
    let finalTaxRate = validatedData.taxRate
    let finalHt = validatedData.priceHT

    const currentTtc = Number(existing.priceTTC ?? existing.price)
    const currentTaxRate = existing.taxRate ? Number(existing.taxRate) : 18.00

    if (finalTtc !== undefined || finalTaxRate !== undefined || finalHt !== undefined) {
      const targetTtc = finalTtc ?? currentTtc
      const targetTaxRate = finalTaxRate ?? currentTaxRate
      const targetHt = finalHt ?? (targetTtc / (1 + targetTaxRate / 100))
      
      finalTtc = targetTtc
      finalTaxRate = targetTaxRate
      finalHt = targetHt
    }

    const updateData: Prisma.ProductUpdateInput = {
      ...rest,
      ...(finalTtc !== undefined ? { price: finalTtc, priceTTC: finalTtc } : {}),
      ...(finalTaxRate !== undefined ? { taxRate: finalTaxRate } : {}),
      ...(finalHt !== undefined ? { priceHT: finalHt } : {}),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      store: { connect: { id: finalStoreId } }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    })
    await redis.del(REDIS_KEYS.products(product.storeId))
    return { success: true, product }
  } catch (error) {
    console.error("Failed to update product:", error)
    return { success: false, error: "Erreur lors de la mise à jour: " + getErrorMessage(error, "Erreur inconnue") }
  }
}

export async function deleteProduct(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Produit non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId, "Produit")
    }

    const product = await prisma.product.delete({
      where: { id }
    })
    await redis.del(REDIS_KEYS.products(product.storeId))
    return { success: true }
  } catch (error) {
    console.error("Failed to delete product:", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return { success: false, error: "Impossible de supprimer ce produit car il est présent dans l'historique des commandes. Rendez-le 'Épuisé' à la place." }
    }
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

export async function getProductsByStore(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await getCached(REDIS_KEYS.products(targetStoreId), 300, async () => {
      const dbProducts = await prisma.product.findMany({
        where: { storeId: targetStoreId },
        include: { category: true, modifiers: true },
        orderBy: { name: 'asc' }
      })
      return dbProducts.map(p => ({
        ...p,
        priceHT: p.priceHT ? Number(p.priceHT) : null,
        taxRate: p.taxRate ? Number(p.taxRate) : null,
        priceTTC: p.priceTTC ? Number(p.priceTTC) : null,
      }))
    })
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return []
  }
}

export async function getCategories(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? (storeId || authStoreId) : authStoreId

  try {
    const where = { storeId: targetStoreId }
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
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await prisma.category.findMany({
      where: { storeId: targetStoreId },
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return []
  }
}

export async function createCategory(data: { name: string, storeId: string, imageUrl?: string }) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const parsed = adminCategorySchema.safeParse({ ...data, storeId: finalStoreId })
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        store: { connect: { id: finalStoreId } },
        imageUrl: validatedData.imageUrl || null
      }
    })
    await redis.del(REDIS_KEYS.products(finalStoreId))
    return { success: true, category }
  } catch (error) {
    console.error("Failed to create category:", error)
    return { success: false, error: "Erreur lors de la création de la catégorie" }
  }
}

export async function updateCategory(id: string, data: { name?: string, imageUrl?: string }) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Catégorie non trouvée" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId, "Catégorie")
    }

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
    return { success: false, error: "Erreur lors de la mise à jour: " + getErrorMessage(error, "Erreur inconnue") }
  }
}

export async function deleteCategory(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Catégorie non trouvée" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId, "Catégorie")
    }

    const category = await prisma.category.delete({
      where: { id }
    })
    await redis.del(REDIS_KEYS.products(category.storeId))
    return { success: true }
  } catch (error) {
    console.error("Failed to delete category:", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return { success: false, error: "Impossible de supprimer cette catégorie car elle contient des produits." }
    }
    return { success: false, error: "Erreur lors de la suppression" }
  }
}
