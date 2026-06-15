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
  startDate?: string
  reason?: string
}

const MANAGER_ROLES = ["ADMIN", "RESTAURATEUR", "MANAGER"]
const LOAN_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SETTLED"]

export async function getLoans(userId?: string) {
  const { storeId, userId: authUserId, role } = await requireAuth()
  const canManageLoans = MANAGER_ROLES.includes(role)

  try {
    const whereClause: Prisma.LoanWhereInput = { user: { storeId } }

    if (canManageLoans && userId) {
      whereClause.userId = userId
    } else if (!canManageLoans) {
      whereClause.userId = authUserId
    }

    const loanRows = await prisma.loan.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricule: true, storeId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const loans = loanRows.map((loan) => ({
      ...loan,
      startDate: loan.approvedAt || loan.createdAt,
      remainingAmount: loan.status === "SETTLED" || loan.status === "REJECTED" ? 0 : loan.amount,
    }))

    return { success: true, loans }
  } catch (error) {
    console.error('Erreur getLoans:', error)
    return { success: false, error: 'Erreur lors de la récupération des prêts/avances' }
  }
}

export async function createLoan(data: LoanPayload) {
  const { storeId, userId: authUserId, role } = await requireAuth()
  const canManageLoans = MANAGER_ROLES.includes(role)
  const targetUserId = canManageLoans ? data.userId : authUserId

  try {
    if (!targetUserId) {
      return { success: false, error: 'Employé cible requis.' }
    }

    // Vérifier que l'employé cible appartient au store
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { storeId: true, salary: true }
    })
    if (!targetUser) return { success: false, error: 'Employé introuvable.' }
    assertSameStore(targetUser.storeId, storeId, "Employé")

    const amount = parseFloat(String(data.amount))
    const monthlyDeduction = data.monthlyDeduction
      ? parseFloat(String(data.monthlyDeduction))
      : amount

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Montant invalide.' }
    }

    if (!Number.isFinite(monthlyDeduction) || monthlyDeduction <= 0) {
      return { success: false, error: 'Retenue mensuelle invalide.' }
    }

    // Validation du montant : plafond à 3x le salaire mensuel
    if (targetUser.salary && amount > targetUser.salary * 3) {
      return { success: false, error: `Le montant dépasse le plafond autorisé (3× le salaire = ${(targetUser.salary * 3).toLocaleString('fr-FR')} FCFA).` }
    }

    const loan = await prisma.loan.create({
      data: {
        userId: targetUserId,
        type: data.type,
        amount,
        monthlyDeduction,
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
  const { storeId, userId: approverUserId } = await requireAuth(MANAGER_ROLES)

  try {
    if (!LOAN_STATUSES.includes(status)) {
      return { success: false, error: 'Statut invalide.' }
    }

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
      updateData.settledAt = null
    }
    if (status === 'SETTLED') {
      updateData.settledAt = new Date()
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
  const { storeId, userId: authUserId, role } = await requireAuth()
  const canManageLoans = MANAGER_ROLES.includes(role)

  try {
    // Vérifier que le prêt appartient au store
    const existing = await prisma.loan.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Prêt/avance introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Prêt/Avance")
    if (!canManageLoans && existing.userId !== authUserId) {
      return { success: false, error: 'Vous ne pouvez supprimer que vos propres demandes.' }
    }
    if (!canManageLoans && existing.status !== 'PENDING') {
      return { success: false, error: 'Seules les demandes en attente peuvent être supprimées.' }
    }

    await prisma.loan.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/avances-prets')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteLoan:', error)
    return { success: false, error: 'Erreur lors de la suppression du prêt/avance' }
  }
}
