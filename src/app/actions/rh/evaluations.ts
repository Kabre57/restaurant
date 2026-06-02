'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getEvaluations(storeId: string, userId?: string) {
  try {
    const whereClause: any = { user: { storeId } }
    if (userId) {
      whereClause.userId = userId
    }

    const evaluations = await prisma.evaluation.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricule: true }
        },
        evaluator: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, evaluations }
  } catch (error) {
    console.error('Erreur getEvaluations:', error)
    return { success: false, error: 'Erreur lors de la récupération des évaluations' }
  }
}

export async function createEvaluation(data: any) {
  try {
    const evaluation = await prisma.evaluation.create({
      data: {
        userId: data.userId,
        evaluatorId: data.evaluatorId,
        period: data.period,
        overallScore: Math.round(parseFloat(data.score || data.overallScore || '5')),
        criteria: data.skills || data.criteria || {},
        strengths: data.strengths || '',
        improvements: data.improvements || '',
        goals: data.objectives || data.goals || '',
        comment: data.comments || data.comment || ''
      }
    })
    revalidatePath('/restaurateur/rh/evaluations')
    return { success: true, evaluation }
  } catch (error) {
    console.error('Erreur createEvaluation:', error)
    return { success: false, error: 'Erreur lors de la création de l\'évaluation' }
  }
}

export async function updateEvaluation(id: string, data: any) {
  try {
    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        period: data.period,
        overallScore: Math.round(parseFloat(data.score || data.overallScore || '5')),
        criteria: data.skills || data.criteria || {},
        strengths: data.strengths,
        improvements: data.improvements,
        goals: data.objectives || data.goals,
        comment: data.comments || data.comment
      }
    })
    revalidatePath('/restaurateur/rh/evaluations')
    return { success: true, evaluation }
  } catch (error) {
    console.error('Erreur updateEvaluation:', error)
    return { success: false, error: 'Erreur lors de la mise à jour de l\'évaluation' }
  }
}

export async function deleteEvaluation(id: string) {
  try {
    await prisma.evaluation.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/evaluations')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteEvaluation:', error)
    return { success: false, error: 'Erreur lors de la suppression de l\'évaluation' }
  }
}
