'use server'

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export async function getStoreDetails(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  if (role !== "ADMIN") {
    assertSameStore(storeId, authStoreId)
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        logo: true,
        commission: true,
      }
    })
    return store
  } catch (error) {
    console.error("Failed to fetch store details:", error)
    return null
  }
}

export async function getStores() {
  await requireAuth(["ADMIN"])

  try {
    return await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        logo: true,
        commission: true,
        createdAt: true,
        users: {
          where: { role: 'RESTAURATEUR' },
          select: { id: true, name: true, email: true },
          take: 1,
        },
        _count: {
          select: { orders: true, products: true, tables: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error("Failed to fetch stores:", error)
    return []
  }
}

export async function createStore(data: {
  name: string
  address?: string
  phone?: string
  email?: string
  logo?: string | null
  commission?: number
  managerName: string
  managerEmail: string
  managerPassword: string
}) {
  await requireAuth(["ADMIN"])

  try {
    if (!data.name.trim() || !data.managerEmail.trim() || !data.managerPassword.trim()) {
      return { success: false, error: 'Nom du restaurant, email manager et mot de passe requis.' }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.managerEmail.trim().toLowerCase() },
      select: { id: true },
    })

    if (existingUser) {
      return { success: false, error: 'Cet email manager existe déjà.' }
    }

    const hashedPassword = await bcrypt.hash(data.managerPassword, 10)
    const store = await prisma.store.create({
      data: {
        name: data.name.trim(),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        logo: data.logo || null,
        commission: data.commission ?? 15,
        users: {
          create: {
            name: data.managerName.trim() || 'Manager Restaurant',
            email: data.managerEmail.trim().toLowerCase(),
            password: hashedPassword,
            role: 'RESTAURATEUR',
          },
        },
      },
      include: {
        users: {
          where: { role: 'RESTAURATEUR' },
          select: { id: true, name: true, email: true },
          take: 1,
        },
        _count: {
          select: { orders: true, products: true, tables: true },
        },
      },
    })

    revalidatePath('/admin/restaurants')
    revalidatePath('/admin/dashboard')

    return { success: true, store }
  } catch (error) {
    console.error('Failed to create store:', error)
    return { success: false, error: 'Impossible de créer le restaurant.' }
  }
}
