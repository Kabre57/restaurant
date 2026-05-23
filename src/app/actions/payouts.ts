'use server'

import { revalidatePath } from 'next/cache'
import { PaymentStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

/**
 * Calcule le montant dû à chaque restaurateur.
 * Net = CA encaissé - commissions plateforme - versements déjà réalisés.
 */
export async function getPayoutSummary() {
  try {
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        commission: true,
        orders: {
          where: { status: 'COMPLETED' },
          select: {
            payments: {
              where: { status: PaymentStatus.REUSSIE },
              select: { amount: true },
            },
          },
        },
        payouts: {
          where: { status: 'COMPLETED' },
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return stores.map((store) => {
      const totalRevenue = store.orders.reduce((sum, order) => {
        return sum + order.payments.reduce((s, p) => s + p.amount, 0)
      }, 0)
      const commissionRate = Number(store.commission || 15)
      const commissionAmount = totalRevenue * (commissionRate / 100)
      const totalPaidOut = store.payouts.reduce((s, p) => s + p.amount, 0)
      const netDue = totalRevenue - commissionAmount - totalPaidOut

      return {
        storeId: store.id,
        storeName: store.name,
        totalRevenue,
        commissionRate,
        commissionAmount,
        totalPaidOut,
        netDue: Math.max(0, netDue),
      }
    })
  } catch (error) {
    console.error('[payouts] getPayoutSummary failed:', error)
    return []
  }
}

/**
 * Crée un versement pour un restaurant donné.
 * Vérifie que le montant ne dépasse pas le net dû.
 */
export async function createPayout(storeId: string, amount: number, note?: string) {
  if (amount <= 0) return { success: false, error: 'Montant invalide' }

  try {
    const summaries = await getPayoutSummary()
    const store = summaries.find((s) => s.storeId === storeId)

    if (!store) return { success: false, error: 'Restaurant introuvable' }
    if (amount > store.netDue + 1) {
      return {
        success: false,
        error: `Montant dépasse le net dû (${Math.round(store.netDue).toLocaleString()} FCFA)`,
      }
    }

    const payout = await prisma.payout.create({
      data: {
        storeId,
        amount,
        status: 'COMPLETED',
        note: note ?? null,
      },
    })

    revalidatePath('/admin/finances')
    return { success: true, payout }
  } catch (error) {
    console.error('[payouts] createPayout failed:', error)
    return { success: false, error: 'Erreur lors du versement' }
  }
}

/**
 * Historique des N derniers versements (tous restaurants confondus).
 */
export async function getPayoutHistory(limit = 20) {
  try {
    return await prisma.payout.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { store: { select: { name: true } } },
    })
  } catch {
    return []
  }
}
