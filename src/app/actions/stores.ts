'use server'

import prisma from '@/lib/prisma'

export async function getStoreDetails(storeId: string) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        logo: true,
        commission: true,
      }
    })
    return store
  } catch (error) {
    console.error("Failed to fetch store details:", error)
    return null
  }
}

export async function getStores() {
  try {
    return await prisma.store.findMany({
      select: { id: true, name: true }
    })
  } catch (error) {
    console.error("Failed to fetch stores:", error)
    return []
  }
}
