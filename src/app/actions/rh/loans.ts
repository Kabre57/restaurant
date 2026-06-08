'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

type LoanPayload = {
  userId: string
  type: string
  amount: string | number
  monthlyDeduction?: string | number
  reason?: string
}

export async function getLoans(userId?: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const whereClause: Prisma.LoanWhereInput = { user: { storeId } }
    if (userId) {
      whereClause.userId = userId
    }

    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricule: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, loans }
  } catch (error) {
    console.error('Erreur getLoans:', error)
    return { success: false, error: 'Erreur lors de la récupération des prêts/avances' }
  }
}

export async function createLoan(data: LoanPayload) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que l'employé cible appartient au store
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { storeId: true, salary: true }
    })
    if (!targetUser) return { success: false, error: 'Employé introuvable.' }
    assertSameStore(targetUser.storeId, storeId, "Employé")

    const amount = parseFloat(String(data.amount))

    // Validation du montant : plafond à 3x le salaire mensuel
    if (targetUser.salary && amount > targetUser.salary * 3) {
      return { success: false, error: `Le montant dépasse le plafond autorisé (3× le salaire = ${(targetUser.salary * 3).toLocaleString('fr-FR')} FCFA).` }
    }

    const loan = await prisma.loan.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: amount,
        monthlyDeduction: parseFloat(String(data.monthlyDeduction || data.amount)),
        reason: data.reason,
        status: 'PENDING'
      }
    })
    revalidatePath('/restaurateur/rh/avances-prets')
    return { success: true, loan }
  } catch (error) {
    console.error('Erreur createLoan:', error)
    return { success: false, error: 'Erreur lors de la création de la demande' }
  }
}

export async function updateLoanStatus(id: string, status: string) {
  const { storeId, userId: approverUserId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que le prêt appartient au store
    const existing = await prisma.loan.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Prêt/avance introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Prêt/Avance")

    const updateData: Prisma.LoanUpdateInput = { status }
    if (status === 'APPROVED') {
      updateData.approvedBy = approverUserId
      updateData.approvedAt = new Date()
    }

    const loan = await prisma.loan.update({
      where: { id },
      data: updateData
    })
    revalidatePath('/restaurateur/rh/avances-prets')
    return { success: true, loan }
  } catch (error) {
    console.error('Erreur updateLoanStatus:', error)
    return { success: false, error: 'Erreur lors de la mise à jour du statut' }
  }
}

export async function deleteLoan(id: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que le prêt appartient au store
    const existing = await prisma.loan.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Prêt/avance introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Prêt/Avance")

    await prisma.loan.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/avances-prets')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteLoan:', error)
    return { success: false, error: 'Erreur lors de la suppression du prêt/avance' }
  }
}
