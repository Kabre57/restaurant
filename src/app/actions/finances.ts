'use server'

import { PaymentStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function getFinancialSummary() {
  await requireAuth(["ADMIN"])

  try {
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        commission: true,
        orders: {
          select: {
            id: true,
            payments: {
              where: { status: PaymentStatus.REUSSIE },
              select: { amount: true },
            },
          },
        },
      },
    })

    const transactions = await prisma.payment.findMany({
      take: 10,
      where: { status: PaymentStatus.REUSSIE },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: { store: true }
        },
        paymentMethod: true
      }
    })

    const totalVolume = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.REUSSIE }
    })

    const storeSummaries = stores.map((store) => {
      const revenue = store.orders.reduce((sum, order) => {
        return sum + order.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0)
      }, 0)
      const commission = revenue * (Number(store.commission || 0) / 100)

      return {
        id: store.id,
        name: store.name,
        orderCount: store.orders.length,
        revenue,
        commission,
        netToRestaurant: revenue - commission,
        commissionRate: Number(store.commission || 0),
      }
    })

    const totalCommission = storeSummaries.reduce((sum, store) => sum + store.commission, 0)
    const totalNetToRestaurants = storeSummaries.reduce((sum, store) => sum + store.netToRestaurant, 0)
    const averageCommissionRate = storeSummaries.length
      ? storeSummaries.reduce((sum, store) => sum + store.commissionRate, 0) / storeSummaries.length
      : 0

    return {
      totalVolume: totalVolume._sum.amount || 0,
      totalCommission,
      totalNetToRestaurants,
      averageCommissionRate,
      stores: storeSummaries.sort((a, b) => b.revenue - a.revenue),
      transactions
    }
  } catch (error) {
    console.error("Failed to fetch financial summary:", error)
    return null
  }
}
