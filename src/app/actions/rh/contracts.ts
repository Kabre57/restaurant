'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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

export async function getContracts(storeId: string, userId?: string) {
  try {
    const whereClause: any = { user: { storeId } }
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
  try {
    if (!data.userId || !data.type || !data.startDate || !data.baseSalary) {
      return { success: false, error: 'Les champs obligatoires ne sont pas remplis.' }
    }

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
  try {
    const contract = await prisma.contract.update({
      where: { id },
      data
    })
    
    if (data.type || data.baseSalary || data.maritalStatus || data.numberOfChildren !== undefined) {
      const updateData: any = {}
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
  try {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } })
    if (!contract) return { success: false, error: 'Contrat introuvable.' }

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
  try {
    await prisma.contract.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/contrats')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete contract:", error)
    return { success: false, error: 'Impossible de supprimer ce contrat.' }
  }
}
