'use server'

import { ReservationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { redis } from '@/lib/redis'

async function publishReservationAlert(storeId: string, payload: unknown) {
  try {
    await redis.publish(`store:${storeId}:pos-alerts`, JSON.stringify(payload))
  } catch (error) {
    console.error('Failed to publish reservation alert:', error)
  }
}

export async function getReservationsByStore(storeId: string) {
  try {
    return await prisma.reservation.findMany({
      where: { storeId },
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
  try {
    const reservation = await prisma.reservation.create({
      data: {
        ...data,
        status: 'EN_ATTENTE'
      },
      include: { table: true }
    })
    await publishReservationAlert(data.storeId, {
      type: 'TABLE_RESERVED',
      storeId: data.storeId,
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
  try {
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
  try {
    await prisma.reservation.delete({ where: { id } })
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete reservation:", error)
    return { success: false, error: "Erreur lors de la suppression" }
  }
}
