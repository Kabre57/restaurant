'use server'

import { ReservationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

async function publishReservationAlert(storeId: string, payload: unknown) {
  try {
    await redis.publish(`store:${storeId}:pos-alerts`, JSON.stringify(payload))
  } catch (error) {
    console.error('Failed to publish reservation alert:', error)
  }
}

export async function getReservationsByStore(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await prisma.reservation.findMany({
      where: { storeId: targetStoreId },
      include: { table: true },
      orderBy: { date: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch reservations:", error)
    return []
  }
}

export async function createReservation(data: {
  storeId: string;
  tableId: string;
  customerName: string;
  phone: string;
  date: Date;
  guests: number;
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const targetTable = await prisma.table.findUnique({ where: { id: data.tableId } })
    if (!targetTable) return { success: false, error: "Table introuvable" }
    assertSameStore(targetTable.storeId, finalStoreId)

    const reservation = await prisma.reservation.create({
      data: {
        ...data,
        storeId: finalStoreId,
        status: 'EN_ATTENTE'
      },
      include: { table: true }
    })
    await publishReservationAlert(finalStoreId, {
      type: 'TABLE_RESERVED',
      storeId: finalStoreId,
      tableId: data.tableId,
      tableNumber: reservation.table.number,
      customerName: data.customerName,
      date: data.date.toISOString(),
      timestamp: new Date().toISOString(),
    })
    revalidatePath('/')
    revalidatePath('/restaurateur/tables')
    return { success: true, reservation }
  } catch (error) {
    console.error("Failed to create reservation:", error)
    return { success: false, error: "Erreur lors de la réservation" }
  }
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const existing = await prisma.reservation.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Réservation introuvable" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status },
      include: { table: true }
    })
    if (status === 'CONFIRMED') {
      await publishReservationAlert(reservation.storeId, {
        type: 'TABLE_RESERVED',
        storeId: reservation.storeId,
        tableId: reservation.tableId,
        tableNumber: reservation.table.number,
        customerName: reservation.customerName,
        date: reservation.date.toISOString(),
        timestamp: new Date().toISOString(),
      })
    }
    
    revalidatePath('/')
    revalidatePath('/restaurateur/tables')
    return { success: true, reservation }
  } catch (error) {
    console.error("Failed to update reservation:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

export async function deleteReservation(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.reservation.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Réservation introuvable" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await prisma.reservation.delete({ where: { id } })
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete reservation:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}
