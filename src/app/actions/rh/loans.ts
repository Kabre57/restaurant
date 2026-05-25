'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getLoans(storeId: string, userId?: string) {
  try {
    const whereClause: any = { user: { storeId } }
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

export async function createLoan(data: any) {
  try {
    const amount = parseFloat(data.amount)
    const loan = await prisma.loan.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: amount,
        remainingAmount: amount,
        monthlyDeduction: parseFloat(data.monthlyDeduction || data.amount),
        startDate: new Date(data.startDate),
        reason: data.reason,
        status: 'ONGOING'
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
  try {
    const loan = await prisma.loan.update({
      where: { id },
      data: { status }
    })
    revalidatePath('/restaurateur/rh/avances-prets')
    return { success: true, loan }
  } catch (error) {
    console.error('Erreur updateLoanStatus:', error)
    return { success: false, error: 'Erreur lors de la mise à jour du statut' }
  }
}

export async function deleteLoan(id: string) {
  try {
    await prisma.loan.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/avances-prets')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteLoan:', error)
    return { success: false, error: 'Erreur lors de la suppression du prêt/avance' }
  }
}
