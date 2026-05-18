'use server'

import { Priority, TicketStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function getSupportTickets() {
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
  try {
    return await prisma.supportTicket.findMany({
      where: { userId },
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
  try {
    if (!data.subject.trim() || !data.description.trim()) {
      return { success: false, error: 'Sujet et description requis.' }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: data.subject.trim(),
        description: data.description.trim(),
        priority: data.priority,
        userId: data.userId || null,
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
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status },
    })

    revalidatePath('/admin/support')
    return { success: true, ticket }
  } catch (error) {
    console.error('Failed to update support ticket:', error)
    return { success: false, error: 'Impossible de mettre à jour le ticket.' }
  }
}
