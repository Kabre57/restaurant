import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export class LoyaltyService {
  /**
   * Récupère un client de fidélité par son numéro de téléphone
   */
  static async getCustomerByPhone(phone: string) {
    return prisma.loyaltyCustomer.findUnique({
      where: { phone },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })
  }

  /**
   * Crée un nouveau client de fidélité
   */
  static async createCustomer(phone: string, nom?: string | null, email?: string | null) {
    return prisma.loyaltyCustomer.create({
      data: {
        phone,
        nom: nom || null,
        email: email || null,
        points: 0,
      },
    })
  }

  /**
   * Ajoute des points de fidélité suite à un achat (1 point par tranche de 100 FCFA)
   */
  static async earnPoints(
    customerId: string,
    orderId: string,
    totalAmount: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma
    const pointsToEarn = Math.floor(totalAmount / 100)

    if (pointsToEarn <= 0) return null

    // Mettre à jour les points du client et créer la transaction
    const [updatedCustomer, transaction] = await Promise.all([
      client.loyaltyCustomer.update({
        where: { id: customerId },
        data: { points: { increment: pointsToEarn } },
      }),
      client.loyaltyTransaction.create({
        data: {
          customerId,
          orderId,
          type: 'EARN',
          points: pointsToEarn,
          description: `Points accumulés sur la commande #${orderId.slice(-6).toUpperCase()}`,
        },
      }),
    ])

    return { customer: updatedCustomer, transaction }
  }

  /**
   * Utilise des points de fidélité pour obtenir une récompense
   */
  static async redeemPoints(
    customerId: string,
    rewardId: string,
    orderId?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma

    // Récupérer la récompense et le client
    const [reward, customer] = await Promise.all([
      client.loyaltyReward.findUnique({ where: { id: rewardId } }),
      client.loyaltyCustomer.findUnique({ where: { id: customerId } }),
    ])

    if (!reward) {
      throw new Error('Récompense introuvable')
    }
    if (!reward.isActive) {
      throw new Error('Cette récompense n’est plus active')
    }
    if (!customer) {
      throw new Error('Client fidélité introuvable')
    }
    if (customer.points < reward.pointsCost) {
      throw new Error(`Points de fidélité insuffisants (${customer.points} disponibles, ${reward.pointsCost} requis)`)
    }

    // Débiter les points et créer la transaction
    const [updatedCustomer, transaction] = await Promise.all([
      client.loyaltyCustomer.update({
        where: { id: customerId },
        data: { points: { decrement: reward.pointsCost } },
      }),
      client.loyaltyTransaction.create({
        data: {
          customerId,
          orderId: orderId || null,
          type: 'REDEEM',
          points: -reward.pointsCost,
          description: `Récompense utilisée : ${reward.label}`,
        },
      }),
    ])

    return { customer: updatedCustomer, transaction, reward }
  }

  /**
   * Liste toutes les récompenses actives
   */
  static async getRewards() {
    return prisma.loyaltyReward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: 'asc' },
    })
  }

  /**
   * Initialise quelques récompenses par défaut si la table est vide
   */
  static async seedDefaultRewardsIfNeeded() {
    const count = await prisma.loyaltyReward.count()
    if (count > 0) return

    const defaultRewards = [
      { code: 'RWD_SODA', label: 'Soda Offert', pointsCost: 50, description: 'Un soda gratuit avec votre commande' },
      { code: 'RWD_DISC_10', label: '10% de Réduction', pointsCost: 100, description: '10% de réduction sur l’addition' },
      { code: 'RWD_BURGER', label: 'Burger Offert', pointsCost: 200, description: 'Un burger de votre choix offert' },
      { code: 'RWD_DISC_25', label: '25% de Réduction', pointsCost: 300, description: '25% de réduction sur l’addition' },
    ]

    await prisma.loyaltyReward.createMany({
      data: defaultRewards,
      skipDuplicates: true,
    })
  }
}
