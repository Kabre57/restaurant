'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function updateStoreConfig(storeId: string, data: { name?: string, address?: string, phone?: string }) {
  try {
    const store = await prisma.store.update({
      where: { id: storeId },
      data
    })
    return { success: true, store }
  } catch (error) {
    console.error("Failed to update store config:", error)
    return { success: false, error: "Erreur lors de la mise à jour de la configuration" }
  }
}
