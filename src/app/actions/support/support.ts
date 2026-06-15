'use server'

import { Priority, TicketStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { supportStatusSchema, supportTicketSchema } from '@/lib/validation/schemas'
import { requireAuth } from '@/lib/auth-guard'

export async function getSupportTickets() {
  await requireAuth(["ADMIN"])

  try {
    return await prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            store: { select: { name: true } },
          },
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch support tickets:', error)
    return []
  }
}

export async function getSupportStats() {
  await requireAuth(["ADMIN"])

  try {
    const [open, inProgress, closed, critical] = await Promise.all([
      prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.CLOSED } }),
      prisma.supportTicket.count({ where: { priority: Priority.CRITICAL } }),
    ])

    return { open, inProgress, closed, critical }
  } catch (error) {
    console.error('Failed to fetch support stats:', error)
    return { open: 0, inProgress: 0, closed: 0, critical: 0 }
  }
}

export async function getSupportTicketsByUser(userId: string) {
  const { userId: authUserId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER", "KITCHEN"])
  const targetUserId = role === "ADMIN" ? userId : authUserId

  try {
    return await prisma.supportTicket.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Failed to fetch user support tickets:', error)
    return []
  }
}

export async function createSupportTicket(data: {
  subject: string
  description: string
  priority: Priority
  userId?: string
}) {
  const { userId: authUserId } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER", "KITCHEN"])

  try {
    const parsed = supportTicketSchema.safeParse({ ...data, userId: authUserId })
    if (!parsed.success) {
      return { success: false, error: 'Données du ticket invalides.' }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority,
        userId: authUserId,
      },
    })

    revalidatePath('/admin/support')
    return { success: true, ticket }
  } catch (error) {
    console.error('Failed to create support ticket:', error)
    return { success: false, error: 'Impossible de créer le ticket.' }
  }
}

export async function updateSupportTicketStatus(id: string, status: TicketStatus) {
  await requireAuth(["ADMIN"])

  try {
    const parsed = supportStatusSchema.safeParse({ id, status })
    if (!parsed.success) return { success: false, error: 'Statut invalide.' }

    const ticket = await prisma.supportTicket.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    })

    revalidatePath('/admin/support')
    return { success: true, ticket }
  } catch (error) {
    console.error('Failed to update support ticket:', error)
    return { success: false, error: 'Impossible de mettre à jour le ticket.' }
  }
}
