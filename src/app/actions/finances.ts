'use server'

import prisma from '@/lib/prisma'

export async function getFinancialSummary() {
  try {
    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    const transactions = await prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: { store: true }
        }
      }
    })

    const totalVolume = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'REUSSIE' }
    })

    return {
      totalVolume: totalVolume._sum.amount || 0,
      totalCommission: (totalVolume._sum.amount || 0) * 0.1, // Mock 10% commission
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        orderCount: s._count.orders,
        revenue: 0, // Should be calculated
        commission: 0
      })),
      transactions
    }
  } catch (error) {
    console.error("Failed to fetch financial summary:", error)
    return null
  }
}
