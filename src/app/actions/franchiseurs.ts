'use server'

import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

type FranchiseurAccount = {
  id: string
  name: string
  email: string
  createdAt: Date
}

export async function getFranchiseurAccounts() {
  try {
    return await prisma.$queryRaw<FranchiseurAccount[]>`
      SELECT "id", "name", "email", "createdAt"
      FROM "User"
      WHERE "role" = 'ADMIN'
      ORDER BY "createdAt" DESC
    `
  } catch (error) {
    console.error('Failed to fetch franchiseur accounts:', error)
    return []
  }
}

export async function createFranchiseurAccount(data: { name: string; email: string; password: string }) {
  try {
    const name = data.name.trim()
    const email = data.email.trim().toLowerCase()
    const password = data.password.trim()

    if (!name || !email || !password) {
      return { success: false, error: 'Nom, email et mot de passe requis.' }
    }

    if (password.length < 8) {
      return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return { success: false, error: 'Cet email est déjà utilisé.' }
    }

    const id = randomUUID()
    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.$executeRaw`
      INSERT INTO "User" ("id", "name", "email", "password", "role", "storeId", "createdAt", "updatedAt")
      VALUES (${id}, ${name}, ${email}, ${hashedPassword}, 'ADMIN'::"Role", NULL, NOW(), NOW())
    `

    const account = { id, name, email, createdAt: new Date() }

    revalidatePath('/admin/franchiseurs')
    return { success: true, account }
  } catch (error) {
    console.error('Failed to create franchiseur account:', error)
    return { success: false, error: 'Impossible de créer le compte Franchiseur.' }
  }
}
