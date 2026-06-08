'use server'

import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

type SuperviseurAccount = {
  id: string
  name: string
  email: string
  createdAt: Date
}

export async function getSuperviseurAccounts() {
  await requireAuth(["ADMIN"])

  try {
    return await prisma.$queryRaw<SuperviseurAccount[]>`
      SELECT "id", "name", "email", "createdAt"
      FROM "User"
      WHERE "role" = 'ADMIN'
      ORDER BY "createdAt" DESC
    `
  } catch (error) {
    console.error('Failed to fetch superviseur accounts:', error)
    return []
  }
}

export async function createSuperviseurAccount(data: { name: string; email: string; password: string }) {
  await requireAuth(["ADMIN"])

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

    revalidatePath('/admin/superviseur')
    return { success: true, account }
  } catch (error) {
    console.error('Failed to create superviseur account:', error)
    return { success: false, error: 'Impossible de créer le compte Superviseur.' }
  }
}

export async function getMultiSiteCriticalStocks() {
  await requireAuth(["ADMIN"])

  try {
    return await prisma.product.findMany({
      where: {
        trackStock: true,
        stockQuantity: {
          lt: prisma.product.fields.minStockLevel
        }
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStockLevel: true,
        store: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        stockQuantity: 'asc'
      },
      take: 10
    })
  } catch (error) {
    console.error('Failed to fetch multi-site critical stocks:', error)
    return []
  }
}

export async function getRecentMultiSiteMovements() {
  await requireAuth(["ADMIN"])

  try {
    return await prisma.stockMovement.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        product: {
          select: {
            name: true,
            store: {
              select: {
                name: true
              }
            }
          }
        }
      },
      take: 10
    })
  } catch (error) {
    console.error('Failed to fetch multi-site movements:', error)
    return []
  }
}
