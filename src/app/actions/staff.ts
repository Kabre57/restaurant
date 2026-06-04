'use server'

import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export async function getStoreStaff(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await prisma.user.findMany({
      where: { storeId: targetStoreId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        salary: true,
        contractType: true,
        hireDate: true,
        phone: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error("Failed to fetch staff:", error)
    return []
  }
}

export async function createStaffMember(data: {
  name: string
  email: string
  password: string
  role: Role
  storeId: string
  salary?: number
  contractType?: string
  hireDate?: Date
  phone?: string
  status?: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const hashedPassword = await bcrypt.hash(data.password, 10)
    
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        storeId: finalStoreId,
        salary: data.salary,
        contractType: data.contractType,
        hireDate: data.hireDate,
        phone: data.phone,
        status: data.status || "ACTIVE"
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
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) return { success: false, error: "Membre du personnel introuvable" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await prisma.user.delete({
      where: { id: userId }
    })
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete staff:", error)
    if (error.code === 'P2003') {
      return { success: false, error: "Impossible: Ce collaborateur est lié à l'historique des commandes et ne peut être supprimé." }
    }
    return { success: false, error: "Erreur lors de la suppression" }
  }
}

export async function updateStaffMember(userId: string, data: {
  name?: string
  email?: string
  role?: Role
  password?: string
  salary?: number
  contractType?: string
  hireDate?: Date
  phone?: string
  status?: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) return { success: false, error: "Membre du personnel introuvable" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const updateData: any = { ...data }
    delete updateData.storeId
    
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10)
    } else {
      delete updateData.password
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })
    
    return { success: true, user: { id: user.id, name: user.name, email: user.email } }
  } catch (error: any) {
    console.error("Failed to update staff:", error)
    if (error.code === 'P2002') return { success: false, error: "Cet email est déjà utilisé" }
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}
