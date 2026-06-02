'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getLeaveRequests(storeId: string, userId?: string) {
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
  try {
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

export async function updateLeaveRequestStatus(id: string, status: string, comment?: string, approvedById?: string) {
  try {
    const updateData: any = { status }
    if (status === 'APPROVED') {
      updateData.approvedBy = approvedById || 'Manager'
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
  try {
    await prisma.leaveRequest.delete({ where: { id } })
    revalidatePath('/restaurateur/rh/conges')
    return { success: true }
  } catch (error) {
    console.error('Erreur deleteLeaveRequest:', error)
    return { success: false, error: 'Erreur lors de la suppression de la demande' }
  }
}
