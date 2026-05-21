'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function createUser(data: {
  name: string
  email: string
  password?: string
  role: 'RESTAURATEUR' | 'CASHIER' | 'KITCHEN' | 'SERVER'
  storeId: string
}) {
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
        storeId: data.storeId
      }
    })

    revalidatePath('/admin/utilisateurs')
    return { success: true, user }
  } catch (error) {
    console.error("Failed to create user:", error)
    return { success: false, error: "Impossible de créer le collaborateur." }
  }
}
