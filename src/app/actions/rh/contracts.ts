'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export type ContractData = {
  userId: string
  type: string
  startDate: Date
  endDate?: Date | null
  position?: string
  department?: string
  baseSalary: number
  status?: string
  maritalStatus?: string
  numberOfChildren?: number
}

export async function getContracts(userId?: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const whereClause: Prisma.ContractWhereInput = { user: { storeId } }
    if (userId) {
      whereClause.userId = userId
    }

    const contracts = await prisma.contract.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricule: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, contracts }
  } catch (error) {
    console.error("Failed to fetch contracts:", error)
    return { success: false, error: 'Impossible de récupérer les contrats.' }
  }
}

export async function createContract(data: ContractData) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    if (!data.userId || !data.type || !data.startDate || !data.baseSalary) {
      return { success: false, error: 'Les champs obligatoires ne sont pas remplis.' }
    }

    // Vérifier que l'employé cible appartient au store de l'appelant
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { storeId: true }
    })
    if (!targetUser) return { success: false, error: 'Employé introuvable.' }
    assertSameStore(targetUser.storeId, storeId, "Employé")

    const contract = await prisma.contract.create({
      data: {
        userId: data.userId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        position: data.position,
        department: data.department,
        baseSalary: data.baseSalary,
        status: data.status || 'ACTIVE'
      }
    })
    
    // Mettre à jour le type de contrat et salaire de base de l'employé
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        contractType: data.type,
        salary: data.baseSalary,
        ...(data.maritalStatus && { maritalStatus: data.maritalStatus }),
        ...(data.numberOfChildren !== undefined && { numberOfChildren: data.numberOfChildren })
      }
    })

    revalidatePath('/restaurateur/rh/contrats')
    revalidatePath('/restaurateur/rh/effectifs')
    
    return { success: true, contract }
  } catch (error) {
    console.error("Failed to create contract:", error)
    return { success: false, error: 'Erreur lors de la création du contrat.' }
  }
}

export async function updateContract(id: string, data: Partial<ContractData>) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que le contrat appartient au store via l'utilisateur
    const existing = await prisma.contract.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Contrat introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Contrat")

    const contract = await prisma.contract.update({
      where: { id },
      data
    })
    
    if (data.type || data.baseSalary || data.maritalStatus || data.numberOfChildren !== undefined) {
      const updateData: Prisma.UserUpdateInput = {}
      if (data.type) updateData.contractType = data.type
      if (data.baseSalary) updateData.salary = data.baseSalary
      if (data.maritalStatus) updateData.maritalStatus = data.maritalStatus
      if (data.numberOfChildren !== undefined) updateData.numberOfChildren = data.numberOfChildren
      
      await prisma.user.update({
        where: { id: contract.userId },
        data: updateData
      })
    }

    revalidatePath('/restaurateur/rh/contrats')
    revalidatePath('/restaurateur/rh/effectifs')
    
    return { success: true, contract }
  } catch (error) {
    console.error("Failed to update contract:", error)
    return { success: false, error: 'Erreur lors de la mise à jour.' }
  }
}

export async function terminateContract(contractId: string, date: Date, reason: string, indemnityAmount: number = 0) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { user: { select: { storeId: true } } }
    })
    if (!contract) return { success: false, error: 'Contrat introuvable.' }
    assertSameStore(contract.user.storeId, storeId, "Contrat")

    await prisma.$transaction([
      prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'TERMINATED',
          endDate: date,
          terminationDate: date,
          terminationNote: `${reason}${indemnityAmount > 0 ? ` — Indemnité: ${indemnityAmount.toLocaleString('fr-FR')} FCFA` : ''}`
        }
      })
    ])

    revalidatePath('/restaurateur/rh/contrats')
    return { success: true }
  } catch (error) {
    console.error("Failed to terminate contract:", error)
    return { success: false, error: 'Erreur lors de la rupture du contrat.' }
  }
}

export async function deleteContract(id: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que le contrat appartient au store
    const existing = await prisma.contract.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Contrat introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Contrat")

    await prisma.contract.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/contrats')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete contract:", error)
    return { success: false, error: 'Impossible de supprimer ce contrat.' }
  }
}
