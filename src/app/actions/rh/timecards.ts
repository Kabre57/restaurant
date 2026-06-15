'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function clockInUser(storeId: string, userId: string) {
  try {
    // Check if already clocked in
    const activeShift = await prisma.timecard.findFirst({
      where: {
        storeId,
        userId,
        clockOut: null
      }
    })

    if (activeShift) {
      return { success: false, error: 'L\'employé est déjà pointé en entrée.' }
    }

    const timecard = await prisma.timecard.create({
      data: {
        storeId,
        userId,
        clockIn: new Date()
      }
    })

    revalidatePath('/restaurateur/staff/presence')
    revalidatePath('/restaurateur/staff/hours')
    return { success: true, data: timecard }
  } catch (error) {
    console.error('[clockInUser]', error)
    return { success: false, error: getErrorMessage(error, 'Erreur lors du pointage d\'entrée.') }
  }
}

export async function clockOutUser(storeId: string, userId: string) {
  try {
    const activeShift = await prisma.timecard.findFirst({
      where: {
        storeId,
        userId,
        clockOut: null
      }
    })

    if (!activeShift) {
      return { success: false, error: 'Aucun pointage d\'entrée actif trouvé pour cet employé.' }
    }

    const clockOut = new Date()
    const diffMs = clockOut.getTime() - activeShift.clockIn.getTime()
    const duration = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)) // duration in hours

    const timecard = await prisma.timecard.update({
      where: { id: activeShift.id },
      data: {
        clockOut,
        duration
      }
    })

    revalidatePath('/restaurateur/staff/presence')
    revalidatePath('/restaurateur/staff/hours')
    return { success: true, data: timecard }
  } catch (error) {
    console.error('[clockOutUser]', error)
    return { success: false, error: getErrorMessage(error, 'Erreur lors du pointage de sortie.') }
  }
}

export async function getPresenceLogs(storeId: string, userId?: string) {
  try {
    const logs = await prisma.timecard.findMany({
      where: {
        storeId,
        ...(userId ? { userId } : {})
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        clockIn: 'desc'
      }
    })
    return logs
  } catch (error) {
    console.error('[getPresenceLogs]', error)
    return []
  }
}

export async function saveManualTimecard(data: {
  id?: string
  storeId: string
  userId: string
  clockIn: Date
  clockOut?: Date | null
}) {
  try {
    let duration: number | null = null
    if (data.clockOut) {
      const diffMs = new Date(data.clockOut).getTime() - new Date(data.clockIn).getTime()
      duration = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2))
    }

    if (data.id) {
      const updated = await prisma.timecard.update({
        where: { id: data.id },
        data: {
          clockIn: new Date(data.clockIn),
          clockOut: data.clockOut ? new Date(data.clockOut) : null,
          duration
        }
      })
      return { success: true, data: updated }
    } else {
      const created = await prisma.timecard.create({
        data: {
          storeId: data.storeId,
          userId: data.userId,
          clockIn: new Date(data.clockIn),
          clockOut: data.clockOut ? new Date(data.clockOut) : null,
          duration
        }
      })
      return { success: true, data: created }
    }
  } catch (error) {
    console.error('[saveManualTimecard]', error)
    return { success: false, error: getErrorMessage(error, 'Erreur lors de l\'enregistrement de la fiche.') }
  }
}

export async function deleteTimecard(id: string) {
  try {
    await prisma.timecard.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error('[deleteTimecard]', error)
    return { success: false, error: getErrorMessage(error, 'Erreur lors de la suppression.') }
  }
}

export async function getHoursWorkedReport(storeId: string) {
  try {
    const timecards = await prisma.timecard.findMany({
      where: {
        storeId,
        clockOut: { not: null }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Group by user
    const reportMap: Record<string, {
      userId: string
      name: string
      email: string
      role: string
      totalHours: number
      shiftsCount: number
    }> = {}

    for (const card of timecards) {
      const userId = card.userId
      if (!reportMap[userId]) {
        reportMap[userId] = {
          userId,
          name: card.user.name,
          email: card.user.email,
          role: card.user.role,
          totalHours: 0,
          shiftsCount: 0
        }
      }
      reportMap[userId].totalHours += card.duration || 0
      reportMap[userId].shiftsCount += 1
    }

    // Convert to array and round hours to 2 decimal places
    const report = Object.values(reportMap).map(item => ({
      ...item,
      totalHours: parseFloat(item.totalHours.toFixed(2))
    }))

    return report
  } catch (error) {
    console.error('[getHoursWorkedReport]', error)
    return []
  }
}
