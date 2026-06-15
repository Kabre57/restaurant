'use server'

import { ReservationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'
import { BookingService } from '@/services/booking.service'

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
    const startTime = new Date(data.date);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2h duration
    const dateOnly = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

    const reservation = await BookingService.createReservation({
      storeId: finalStoreId,
      tableId: data.tableId,
      customerName: data.customerName,
      phone: data.phone,
      email: null,
      date: dateOnly,
      startTime,
      guests: data.guests,
    });

    revalidatePath('/')
    revalidatePath('/restaurateur/tables')
    return { success: true, reservation }
  } catch (error: unknown) {
    console.error("Failed to create reservation:", error)
    const msg = error instanceof Error ? error.message : "Erreur lors de la réservation"
    return { success: false, error: msg }
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

    const reservation = await BookingService.updateStatus(id, status, role);
    revalidatePath('/')
    revalidatePath('/restaurateur/tables')
    return { success: true, reservation }
  } catch (error: unknown) {
    console.error("Failed to update reservation:", error)
    const msg = error instanceof Error ? error.message : "Erreur lors de la mise à jour"
    return { success: false, error: msg }
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
