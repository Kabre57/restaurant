'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

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

export async function addProduct(data: { 
  name: string, 
  price: number, 
  categoryId: string, 
  image: string | null, 
  storeId: string,
  trackStock?: boolean,
  stockQuantity?: number,
  minStockLevel?: number
}) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
        image: data.image,
        storeId: data.storeId,
        isAvailable: true,
        trackStock: data.trackStock || false,
        stockQuantity: data.stockQuantity || 0,
        minStockLevel: data.minStockLevel || 5
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

export async function updateProductStock(productId: string, quantity: number) {
  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: quantity }
    })
    revalidatePath('/admin/produits')
    return { success: true, product }
  } catch (error) {
    return { success: false, error: "Erreur lors de la mise à jour du stock." }
  }
}

export async function getSalesReport(storeId: string, period: 'daily' | 'monthly' = 'daily') {
  try {
    const orders = await prisma.order.findMany({
      where: { storeId, status: 'COMPLETED' },
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

export async function getGlobalStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orderCount = await prisma.order.count({
      where: { createdAt: { gte: today } }
    })
    
    const storeCount = await prisma.store.count()

    const stores = await prisma.store.findMany({
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
