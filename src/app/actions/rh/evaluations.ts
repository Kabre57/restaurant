'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

type EvaluationPayload = {
  userId: string
  evaluatorId?: string
  period?: string
  score?: string | number
  overallScore?: string | number
  skills?: Prisma.InputJsonValue
  criteria?: Prisma.InputJsonValue
  strengths?: string
  improvements?: string
  objectives?: string
  goals?: string
  comments?: string
  comment?: string
}

function parseEvaluationScore(value: string | number | undefined) {
  return Math.round(parseFloat(String(value ?? '5')))
}

export async function getEvaluations(userId?: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const whereClause: Prisma.EvaluationWhereInput = { user: { storeId } }
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

export async function createEvaluation(data: EvaluationPayload) {
  const { storeId, userId: sessionUserId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que l'employé évalué appartient au store
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { storeId: true }
    })
    if (!targetUser) return { success: false, error: 'Employé introuvable.' }
    assertSameStore(targetUser.storeId, storeId, "Employé")

    // Vérifier que l'évaluateur appartient aussi au store (si spécifié)
    const evaluatorId = data.evaluatorId || sessionUserId
    if (data.evaluatorId && data.evaluatorId !== sessionUserId) {
      const evaluatorUser = await prisma.user.findUnique({
        where: { id: data.evaluatorId },
        select: { storeId: true }
      })
      if (!evaluatorUser) return { success: false, error: 'Évaluateur introuvable.' }
      assertSameStore(evaluatorUser.storeId, storeId, "Évaluateur")
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        userId: data.userId,
        evaluatorId: evaluatorId,
        period: data.period || '',
        overallScore: parseEvaluationScore(data.score ?? data.overallScore),
        criteria: data.skills ?? data.criteria ?? {},
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

export async function updateEvaluation(id: string, data: EvaluationPayload) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que l'évaluation appartient au store
    const existing = await prisma.evaluation.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Évaluation introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Évaluation")

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        period: data.period,
        overallScore: parseEvaluationScore(data.score ?? data.overallScore),
        criteria: data.skills ?? data.criteria ?? {},
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
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que l'évaluation appartient au store
    const existing = await prisma.evaluation.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Évaluation introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Évaluation")

    await prisma.evaluation.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/evaluations')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteEvaluation:', error)
    return { success: false, error: 'Erreur lors de la suppression de l\'évaluation' }
  }
}
