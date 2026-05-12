'use server'

import { TableStatus, TableShape } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function getTablesByStore(storeId: string) {
  try {
    return await prisma.table.findMany({
      where: { storeId },
      orderBy: { number: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch tables:", error)
    return []
  }
}

export async function createTable(data: { storeId: string, number: number, capacity: number, x?: number, y?: number, shape?: TableShape }) {
  try {
    const table = await prisma.table.create({
      data: {
        storeId: data.storeId,
        number: data.number,
        capacity: data.capacity,
        x: data.x || 0,
        y: data.y || 0,
        shape: data.shape || 'RECTANGLE'
      }
    })
    revalidatePath('/restaurateur/tables')
    return { success: true, table }
  } catch (error) {
    console.error("Failed to create table:", error)
    return { success: false, error: "Erreur lors de la création de la table" }
  }
}

export async function updateTablePosition(tableId: string, x: number, y: number) {
  try {
    const table = await prisma.table.update({
      where: { id: tableId },
      data: { x, y }
    })
    return { success: true, table }
  } catch (error) {
    console.error("Failed to update table position:", error)
    return { success: false, error: "Erreur lors du déplacement" }
  }
}

export async function updateTableDetails(tableId: string, data: { number?: number, capacity?: number, shape?: TableShape, width?: number, height?: number }) {
  try {
    const table = await prisma.table.update({
      where: { id: tableId },
      data
    })
    revalidatePath('/restaurateur/tables')
    return { success: true, table }
  } catch (error) {
    console.error("Failed to update table details:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

export async function deleteTable(tableId: string) {
  try {
    await prisma.table.delete({
      where: { id: tableId }
    })
    revalidatePath('/restaurateur/tables')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete table:", error)
    if (error.code === 'P2003') {
      return { success: false, error: "Impossible de supprimer cette table car elle possède des commandes ou des réservations associées." }
    }
    return { success: false, error: "Erreur lors de la suppression" }
  }
}
