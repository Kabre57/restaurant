'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guard'

export async function createCustomer(data: {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  notes?: string
  storeId?: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  const finalStoreId = role === "ADMIN" ? (data.storeId || authStoreId) : authStoreId

  if (!finalStoreId) {
    return { success: false, error: 'Store ID est requis.' }
  }

  try {
    if (!data.firstName || !data.lastName) {
      return { success: false, error: 'Prénom et Nom sont requis.' }
    }

    const customer = await prisma.customer.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
        storeId: finalStoreId,
        loyalty: {
          create: { points: 0 }
        }
      }
    })

    revalidatePath('/admin/clients')
    return { success: true, customer }
  } catch (error) {
    console.error("Failed to create customer:", error)
    return { success: false, error: "Impossible de créer le client (Peut-être qu'un client avec ce téléphone existe déjà dans ce restaurant)." }
  }
}

export async function updateCustomer(
  id: string,
  data: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    notes?: string
  }
) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    // Verify client belongs to same store if not ADMIN
    const existing = await prisma.customer.findUnique({
      where: { id }
    })

    if (!existing || (role !== "ADMIN" && existing.storeId !== authStoreId)) {
      return { success: false, error: "Non autorisé ou client introuvable." }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
      }
    })

    revalidatePath('/admin/clients')
    return { success: true, customer }
  } catch (error) {
    console.error("Failed to update customer:", error)
    return { success: false, error: "Impossible de modifier le client." }
  }
}

export async function getCustomers(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  const targetStoreId = role === "ADMIN" ? (storeId || authStoreId) : authStoreId

  try {
    return await prisma.customer.findMany({
      where: targetStoreId ? { storeId: targetStoreId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        loyalty: true,
        orders: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            status: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  } catch (error) {
    console.error("Failed to fetch customers:", error)
    return []
  }
}

export async function searchCustomerAction(phone: string, storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  const targetStoreId = role === "ADMIN" ? (storeId || authStoreId) : authStoreId

  try {
    return await prisma.customer.findFirst({
      where: {
        phone,
        storeId: targetStoreId
      },
      include: { loyalty: true }
    })
  } catch {
    return null
  }
}


