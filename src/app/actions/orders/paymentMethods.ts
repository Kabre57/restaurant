'use server'

import { prisma } from '@/lib/db'
import { PaymentType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

const PAYMENT_READ_ROLES = ["ADMIN", "RESTAURATEUR", "MANAGER", "CASHIER", "SERVER"]
const PAYMENT_CONFIG_ROLES = ["ADMIN", "RESTAURATEUR"]
const DEFAULT_PAYMENT_METHODS = [
  { name: 'Espèces', type: 'CASH' as const, isDefault: true, displayOrder: 1, icon: '💵' },
  { name: 'Carte Bancaire', type: 'CARD' as const, isDefault: false, displayOrder: 2, icon: '💳' },
  { name: 'Mobile Money', type: 'MOBILE_MONEY' as const, isDefault: false, displayOrder: 3, icon: '📱' },
]

function getTargetStoreId(role: string, requestedStoreId: string | undefined, authStoreId: string) {
  return role === "ADMIN" ? requestedStoreId : authStoreId
}

function revalidatePaymentConfigPaths() {
  revalidatePath('/restaurateur/config/paiements')
  revalidatePath('/admin/config/paiements')
  revalidatePath('/cashier')
}

export async function getPaymentMethods(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(PAYMENT_READ_ROLES)
  const targetStoreId = getTargetStoreId(role, storeId, authStoreId)

  try {
    if (!targetStoreId) return { success: true, methods: [] }

    if (role !== "ADMIN") {
      assertSameStore(targetStoreId, authStoreId, "Restaurant")
    }

    const storeMethods = await prisma.paymentMethod.findMany({
      where: { storeId: targetStoreId },
      orderBy: { displayOrder: 'asc' }
    })

    if (storeMethods.length > 0) {
      return { success: true, methods: storeMethods }
    }

    const globalMethods = await prisma.paymentMethod.findMany({
      where: { storeId: null },
      orderBy: { displayOrder: 'asc' }
    })

    return { success: true, methods: globalMethods }
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return { success: false, error: 'Erreur lors de la récupération des modes de paiement' }
  }
}

export async function ensureDefaultPaymentMethods(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth(PAYMENT_CONFIG_ROLES)
  const targetStoreId = getTargetStoreId(role, storeId, authStoreId)

  try {
    if (!targetStoreId) return { success: false, error: 'Restaurant requis.' }

    if (role !== "ADMIN") {
      assertSameStore(targetStoreId, authStoreId, "Restaurant")
    }

    for (const defaultMethod of DEFAULT_PAYMENT_METHODS) {
      const existing = await prisma.paymentMethod.findFirst({
        where: { storeId: targetStoreId, type: defaultMethod.type }
      })

      if (!existing) {
        await prisma.paymentMethod.create({
          data: {
            ...defaultMethod,
            storeId: targetStoreId,
            isActive: true,
          }
        })
      }
    }

    revalidatePaymentConfigPaths()
    return { success: true }
  } catch (error) {
    console.error('Error ensuring default payment methods:', error)
    return { success: false, error: 'Erreur lors de la création des modes de paiement par défaut' }
  }
}

export async function createPaymentMethod(storeId: string, data: { name: string; type: PaymentType; icon?: string; displayOrder?: number }) {
  const { storeId: authStoreId, role } = await requireAuth(PAYMENT_CONFIG_ROLES)
  const targetStoreId = getTargetStoreId(role, storeId, authStoreId)

  try {
    if (!targetStoreId) return { success: false, error: 'Restaurant requis.' }

    if (role !== "ADMIN") {
      assertSameStore(targetStoreId, authStoreId, "Restaurant")
    }

    if (!data.name.trim()) {
      return { success: false, error: 'Nom du mode de paiement requis.' }
    }

    const method = await prisma.paymentMethod.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        icon: data.icon,
        displayOrder: data.displayOrder,
        storeId: targetStoreId,
        isActive: true,
      }
    })
    revalidatePaymentConfigPaths()
    return { success: true, method }
  } catch (error) {
    console.error('Error creating payment method:', error)
    return { success: false, error: 'Erreur lors de la création du mode de paiement' }
  }
}

export async function updatePaymentMethod(id: string, data: { name?: string; isActive?: boolean; icon?: string; displayOrder?: number }) {
  const { storeId: authStoreId, role } = await requireAuth(PAYMENT_CONFIG_ROLES)

  try {
    const existing = await prisma.paymentMethod.findUnique({ where: { id } })
    if (!existing) return { success: false, error: 'Mode de paiement introuvable.' }

    if (role !== "ADMIN") {
      if (!existing.storeId) {
        return { success: false, error: 'Impossible de modifier un mode global.' }
      }
      assertSameStore(existing.storeId, authStoreId, "Mode de paiement")
    }

    const method = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...data,
        name: data.name?.trim(),
      }
    })
    revalidatePaymentConfigPaths()
    return { success: true, method }
  } catch (error) {
    console.error('Error updating payment method:', error)
    return { success: false, error: 'Erreur lors de la mise à jour du mode de paiement' }
  }
}

export async function deletePaymentMethod(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(PAYMENT_CONFIG_ROLES)

  try {
    const method = await prisma.paymentMethod.findUnique({ where: { id } })
    if (!method) return { success: false, error: 'Mode de paiement introuvable.' }

    if (method?.isDefault) {
      return { success: false, error: 'Impossible de supprimer le moyen de paiement par défaut' }
    }

    if (role !== "ADMIN") {
      if (!method.storeId) {
        return { success: false, error: 'Impossible de supprimer un mode global.' }
      }
      assertSameStore(method.storeId, authStoreId, "Mode de paiement")
    }

    await prisma.paymentMethod.delete({
      where: { id }
    })
    revalidatePaymentConfigPaths()
    return { success: true }
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return { success: false, error: 'Erreur lors de la suppression (il y a peut-être des paiements liés)' }
  }
}
