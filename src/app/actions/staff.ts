'use server'

import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function getStoreStaff(storeId: string) {
  try {
    return await prisma.user.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error("Failed to fetch staff:", error)
    return []
  }
}

export async function createStaffMember(data: { name: string, email: string, password: string, role: Role, storeId: string }) {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10)
    
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        storeId: data.storeId
      }
    })
    
    return { success: true, user: { id: user.id, name: user.name, email: user.email } }
  } catch (error: any) {
    console.error("Failed to create staff:", error)
    if (error.code === 'P2002') return { success: false, error: "Cet email est déjà utilisé" }
    return { success: false, error: "Erreur lors de la création du membre du personnel" }
  }
}

export async function deleteStaffMember(userId: string) {
  try {
    await prisma.user.delete({
      where: { id: userId }
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to delete staff:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}
