'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export type SupplementOption = {
  id: string
  name: string
  price: number
  categoryId: string | null
  storeId: string
  type: 'SUPPLEMENT' | 'REMOVAL'
}

// Fetch all supplement/removal options for a store
export async function getProductOptions(storeId: string): Promise<SupplementOption[]> {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  const results = await (prisma as any).productOption?.findMany({
    where: { storeId: targetStoreId },
    orderBy: { name: 'asc' },
  }).catch(() => [])
  return results ?? []
}

export async function createProductOption(data: {
  storeId: string
  name: string
  price: number
  categoryId: string | null
  type: 'SUPPLEMENT' | 'REMOVAL'
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const record = await (prisma as any).productOption?.create({
      data: {
        ...data,
        storeId: finalStoreId
      }
    })
    revalidatePath('/restaurateur/supplements')
    return { success: true, record }
  } catch (error) {
    console.error('createProductOption error:', error)
    return { success: false, error: 'Impossible de créer cette option.' }
  }
}

export async function deleteProductOption(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await (prisma as any).productOption?.findUnique({ where: { id } })
    if (!existing) return { success: false, error: 'Option introuvable.' }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await (prisma as any).productOption?.delete({ where: { id } })
    revalidatePath('/restaurateur/supplements')
    return { success: true }
  } catch (error) {
    console.error('deleteProductOption error:', error)
    return { success: false, error: 'Suppression impossible.' }
  }
}
