'use server'

import { prisma } from '@/lib/db'
import { PaymentType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getPaymentMethods(storeId?: string) {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: {
        OR: [
          { storeId: storeId },
          { storeId: null }
        ]
      },
      orderBy: { displayOrder: 'asc' }
    })
    
    return { success: true, methods }
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return { success: false, error: 'Erreur lors de la récupération des modes de paiement' }
  }
}

export async function ensureDefaultPaymentMethods(storeId: string) {
  try {
    const existing = await prisma.paymentMethod.findFirst({
      where: { storeId }
    })

    if (!existing) {
      await prisma.paymentMethod.createMany({
        data: [
          { name: 'Espèces', type: 'CASH', isDefault: true, storeId, displayOrder: 1, icon: '💵' },
          { name: 'Carte Bancaire', type: 'CARD', storeId, displayOrder: 2, icon: '💳' },
          { name: 'Mobile Money', type: 'MOBILE_MONEY', storeId, displayOrder: 3, icon: '📱' }
        ]
      })
    }
    return { success: true }
  } catch (error) {
    console.error('Error ensuring default payment methods:', error)
    return { success: false }
  }
}

export async function createPaymentMethod(storeId: string, data: { name: string; type: PaymentType; icon?: string; displayOrder?: number }) {
  try {
    const method = await prisma.paymentMethod.create({
      data: {
        ...data,
        storeId,
        isActive: true,
      }
    })
    revalidatePath('/restaurateur/config/paiements')
    return { success: true, method }
  } catch (error) {
    console.error('Error creating payment method:', error)
    return { success: false, error: 'Erreur lors de la création du mode de paiement' }
  }
}

export async function updatePaymentMethod(id: string, data: { name?: string; isActive?: boolean; icon?: string; displayOrder?: number }) {
  try {
    // Si on désactive un moyen par défaut, on pourrait bloquer, mais laissons libre
    const method = await prisma.paymentMethod.update({
      where: { id },
      data
    })
    revalidatePath('/restaurateur/config/paiements')
    return { success: true, method }
  } catch (error) {
    console.error('Error updating payment method:', error)
    return { success: false, error: 'Erreur lors de la mise à jour du mode de paiement' }
  }
}

export async function deletePaymentMethod(id: string) {
  try {
    // Check if it's default
    const method = await prisma.paymentMethod.findUnique({ where: { id } })
    if (method?.isDefault) {
      return { success: false, error: 'Impossible de supprimer le moyen de paiement par défaut' }
    }

    await prisma.paymentMethod.delete({
      where: { id }
    })
    revalidatePath('/restaurateur/config/paiements')
    return { success: true }
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return { success: false, error: 'Erreur lors de la suppression (il y a peut-être des paiements liés)' }
  }
}
