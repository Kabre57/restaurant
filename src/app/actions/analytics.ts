'use server'

import { PaymentStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function getAdminAnalytics() {
  try {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    since.setHours(0, 0, 0, 0)

    const [orders, payments, topProducts, stores] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          actualPrepMinutes: true,
          store: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: since }, status: PaymentStatus.REUSSIE },
        select: { amount: true, method: true, createdAt: true, order: { select: { storeId: true } } },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { createdAt: { gte: since } } },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.store.findMany({ select: { id: true, name: true } }),
    ])

    const productIds = topProducts.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    })
    const productNames = new Map(products.map((product) => [product.id, product.name]))

    const revenueByDay = new Map<string, number>()
    const paymentByMethod = new Map<string, number>()
    const storeStats = new Map(stores.map((store) => [store.id, { id: store.id, name: store.name, orders: 0, revenue: 0 }]))

    payments.forEach((payment) => {
      revenueByDay.set(dayKey(payment.createdAt), (revenueByDay.get(dayKey(payment.createdAt)) || 0) + payment.amount)
      paymentByMethod.set(payment.method, (paymentByMethod.get(payment.method) || 0) + payment.amount)
      const store = storeStats.get(payment.order.storeId)
      if (store) store.revenue += payment.amount
    })

    orders.forEach((order) => {
      const store = storeStats.get(order.store.id)
      if (store) store.orders += 1
    })

    const completedOrders = orders.filter((order) => order.status === 'COMPLETED')
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const prepSamples = orders.filter((order) => typeof order.actualPrepMinutes === 'number')
    const averagePrepMinutes = prepSamples.length
      ? Math.round(prepSamples.reduce((sum, order) => sum + Number(order.actualPrepMinutes), 0) / prepSamples.length)
      : 0

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      averageBasket: completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0,
      averagePrepMinutes,
      revenueByDay: Array.from(revenueByDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue })),
      paymentByMethod: Array.from(paymentByMethod.entries()).map(([method, amount]) => ({ method, amount })),
      stores: Array.from(storeStats.values()).sort((a, b) => b.revenue - a.revenue),
      topProducts: topProducts.map((item) => ({
        productId: item.productId,
        name: productNames.get(item.productId) || 'Produit supprimé',
        quantity: item._sum.quantity || 0,
        lines: item._count.id,
      })),
    }
  } catch (error) {
    console.error('Failed to fetch admin analytics:', error)
    return null
  }
}
