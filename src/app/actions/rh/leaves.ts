'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export async function getLeaveRequests(userId?: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const whereClause: any = { user: { storeId } }
    if (userId) {
      whereClause.userId = userId
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricule: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, leaves }
  } catch (error) {
    console.error('Erreur getLeaveRequests:', error)
    return { success: false, error: 'Erreur lors de la récupération des congés' }
  }
}

export async function createLeaveRequest(data: any) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que l'employé cible appartient au store
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { storeId: true }
    })
    if (!targetUser) return { success: false, error: 'Employé introuvable.' }
    assertSameStore(targetUser.storeId, storeId, "Employé")

    const leave = await prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        daysCount: parseInt(data.daysCount, 10),
        reason: data.reason,
        status: 'PENDING'
      }
    })
    revalidatePath('/restaurateur/rh/conges')
    return { success: true, leave }
  } catch (error) {
    console.error('Erreur createLeaveRequest:', error)
    return { success: false, error: 'Erreur lors de la création de la demande' }
  }
}

export async function updateLeaveRequestStatus(id: string, status: string, comment?: string) {
  const { storeId, userId: approverUserId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que la demande de congé appartient au store
    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Demande de congé introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Demande de congé")

    const updateData: any = { status }
    if (status === 'APPROVED') {
      updateData.approvedBy = approverUserId // ✅ Utilise l'ID de session, pas un paramètre client
      updateData.approvedAt = new Date()
    } else if (status === 'REJECTED') {
      updateData.rejectedNote = comment || ''
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: updateData
    })
    revalidatePath('/restaurateur/rh/conges')
    return { success: true, leave }
  } catch (error) {
    console.error('Erreur updateLeaveRequestStatus:', error)
    return { success: false, error: 'Erreur lors de la mise à jour du statut' }
  }
}

export async function deleteLeaveRequest(id: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que la demande appartient au store
    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Demande de congé introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Demande de congé")

    await prisma.leaveRequest.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/conges')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteLeaveRequest:', error)
    return { success: false, error: 'Erreur lors de la suppression de la demande' }
  }
}
