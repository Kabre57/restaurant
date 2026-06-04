'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

/**
 * Bascule la disponibilité d'un produit (disponible / en rupture).
 * Revalide le chemin du back-office et du POS pour que les changements soient immédiats.
 */
export async function toggleProductAvailability(productId: string, isAvailable: boolean) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } })
    if (!existing) return { success: false, error: "Produit introuvable." }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { isAvailable },
    })
    revalidatePath('/restaurateur/produits')
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
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    if (price <= 0) return { success: false, error: "Le prix doit être supérieur à 0." }
    const existing = await prisma.product.findUnique({ where: { id: productId } })
    if (!existing) return { success: false, error: "Produit introuvable." }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { price },
    })
    revalidatePath('/restaurateur/produits')
    revalidatePath('/')
    return { success: true, product }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du prix:", error)
    return { success: false, error: "Impossible de mettre à jour le prix." }
  }
}

/**
 * Met à jour le code-barres d'un produit.
 */
export async function updateProductBarcode(productId: string, barcode: string | null) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } })
    if (!existing) return { success: false, error: "Produit introuvable." }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const cleanBarcode = barcode?.trim() || null

    if (cleanBarcode) {
      // Check for duplicate barcode in same store
      const duplicate = await prisma.product.findFirst({
        where: {
          storeId: existing.storeId,
          barcode: cleanBarcode,
          NOT: { id: productId }
        }
      })
      if (duplicate) {
        return { success: false, error: "Ce code-barres est déjà utilisé pour un autre produit." }
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { barcode: cleanBarcode },
    })
    revalidatePath('/restaurateur/produits')
    revalidatePath('/')
    return { success: true, product }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du code-barres:", error)
    return { success: false, error: "Impossible de mettre à jour le code-barres." }
  }
}

export async function getProductsForAdmin(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    const where = targetStoreId ? { storeId: targetStoreId } : {}
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      include: { category: true },
    })
    return products
  } catch (error) {
    console.error("Impossible de récupérer les produits:", error)
    return []
  }
}

export async function getCategories(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    const where = targetStoreId ? { storeId: targetStoreId } : {}
    return await prisma.category.findMany({ 
      where,
      orderBy: { name: 'asc' } 
    })
  } catch (error) {
    return []
  }
}

export async function addProduct(data: { 
  name: string, 
  price: number, 
  categoryId: string, 
  image: string | null, 
  storeId: string,
  trackStock?: boolean,
  stockQuantity?: number,
  minStockLevel?: number,
  averagePrepTimeMins?: number,
  barcode?: string | null
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
    if (!category) return { success: false, error: "Catégorie introuvable." }
    assertSameStore(category.storeId, finalStoreId)

    const cleanBarcode = data.barcode?.trim() || null

    if (cleanBarcode) {
      // Check for duplicate barcode in same store
      const duplicate = await prisma.product.findFirst({
        where: {
          storeId: finalStoreId,
          barcode: cleanBarcode
        }
      })
      if (duplicate) {
        return { success: false, error: "Ce code-barres est déjà utilisé pour un autre produit de votre magasin." }
      }
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
        image: data.image,
        storeId: finalStoreId,
        isAvailable: true,
        trackStock: data.trackStock || false,
        stockQuantity: data.stockQuantity || 0,
        minStockLevel: data.minStockLevel || 5,
        averagePrepTimeMins: data.averagePrepTimeMins || undefined,
        barcode: cleanBarcode
      },
      include: { category: true }
    })
    revalidatePath('/restaurateur/produits')
    revalidatePath('/')
    return { success: true, product }
  } catch (error) {
    console.error("Erreur creation produit:", error)
    return { success: false, error: "Erreur lors de l'ajout." }
  }
}

export async function updateProductStock(productId: string, quantity: number) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } })
    if (!existing) return { success: false, error: "Produit introuvable." }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: quantity }
    })
    revalidatePath('/restaurateur/produits')
    return { success: true, product }
  } catch (error) {
    return { success: false, error: "Erreur lors de la mise à jour du stock." }
  }
}

export async function getSalesReport(storeId: string | null, period: 'daily' | 'monthly' = 'daily') {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  if (!storeId) {
    if (role !== "ADMIN") throw new Error("Accès non autorisé")
  } else {
    if (role !== "ADMIN") {
      assertSameStore(storeId, authStoreId)
    }
  }
  const finalStoreId = role === "ADMIN" ? (storeId || undefined) : authStoreId

  try {
    const orders = await prisma.order.findMany({
      where: {
        ...(finalStoreId ? { storeId: finalStoreId } : {}),
        status: 'COMPLETED'
      },
      select: { total: true, createdAt: true }
    })

    // Simple grouping by day or month
    const report: Record<string, number> = {}
    orders.forEach(o => {
      const date = new Date(o.createdAt)
      const key = period === 'daily' 
        ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        : date.toLocaleDateString('fr-FR', { month: 'long' })
      report[key] = (report[key] || 0) + o.total
    })

    return Object.entries(report).map(([name, value]) => ({ name, value }))
  } catch (error) {
    console.error("Failed to fetch sales report:", error)
    return []
  }
}


export async function getGlobalStats(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  if (!storeId) {
    if (role !== "ADMIN") throw new Error("Accès non autorisé")
  } else {
    if (role !== "ADMIN") {
      assertSameStore(storeId, authStoreId)
    }
  }
  const finalStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orderWhere = finalStoreId 
      ? { createdAt: { gte: today }, storeId: finalStoreId } 
      : { createdAt: { gte: today } }

    const orderCount = await prisma.order.count({
      where: orderWhere
    })
    
    const storeCount = finalStoreId ? 1 : await prisma.store.count()

    const stores = await prisma.store.findMany({
      where: finalStoreId ? { id: finalStoreId } : undefined,
      include: {
        orders: {
          where: { status: 'COMPLETED' },
          select: { total: true }
        }
      }
    })

    let totalRevenue = 0
    let totalCommissions = 0

    const topStoresData = stores.map(store => {
      const storeRevenue = store.orders.reduce((sum, o) => sum + o.total, 0)
      totalRevenue += storeRevenue
      totalCommissions += storeRevenue * ((store.commission || 15) / 100)
      return {
        id: store.id,
        name: store.name,
        orderCount: store.orders.length,
        revenue: storeRevenue
      }
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 3)

    const recentOrders = await prisma.order.findMany({
      where: finalStoreId ? { storeId: finalStoreId } : undefined,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { store: true }
    })

    return {
      orderCount,
      storeCount,
      totalRevenue,
      totalCommissions,
      recentOrders,
      topStores: topStoresData
    }
  } catch (error) {
    console.error("Failed to fetch global stats:", error)
    return null
  }
}

export async function getPendingValidations() {
  await requireAuth(["ADMIN"])

  try {
    const restaurateurRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "User"
      WHERE "role" = 'RESTAURATEUR' AND "approvalStatus" = 'PENDING'
    `
    
    const deliveryRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "DeliveryPerson"
      WHERE "approvalStatus" = 'PENDING'
    `

    const pendingRestaurateurs = Number(restaurateurRows[0]?.count || 0)
    const pendingDelivery = Number(deliveryRows[0]?.count || 0)
    
    return {
      pendingRestaurateurs,
      pendingDelivery,
      totalPending: pendingRestaurateurs + pendingDelivery
    }
  } catch (error) {
    console.error("Failed to fetch pending validations:", error)
    return { pendingRestaurateurs: 0, pendingDelivery: 0, totalPending: 0 }
  }
}
