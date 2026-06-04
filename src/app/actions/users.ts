'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { requireAuth } from '@/lib/auth-guard'

export async function createUser(data: {
  name: string
  email: string
  password?: string
  role: 'RESTAURATEUR' | 'CASHIER' | 'KITCHEN' | 'SERVER'
  storeId: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    if (!data.name || !data.email) {
      return { success: false, error: 'Nom et Email sont requis.' }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() }
    })

    if (existingUser) {
      return { success: false, error: 'Un utilisateur avec cet email existe déjà.' }
    }

    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : await bcrypt.hash('password123', 10)

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashedPassword,
        role: data.role,
        storeId: finalStoreId
      }
    })

    revalidatePath('/admin/utilisateurs')
    return { success: true, user }
  } catch (error) {
    console.error("Failed to create user:", error)
    return { success: false, error: "Impossible de créer le collaborateur." }
  }
}
