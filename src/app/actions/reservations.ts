'use server'

import { PrismaClient, ReservationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

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
      }
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
      data: { status }
    })
    
    // If confirmed, we might want to update the table status, but usually, 
    // table status changes when the customer actually arrives.
    
    revalidatePath('/')
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
