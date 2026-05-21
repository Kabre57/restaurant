'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

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
  const results = await (prisma as any).productOption?.findMany({
    where: { storeId },
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
  try {
    const record = await (prisma as any).productOption?.create({ data })
    revalidatePath('/admin/supplements')
    return { success: true, record }
  } catch (error) {
    console.error('createProductOption error:', error)
    return { success: false, error: 'Impossible de créer cette option.' }
  }
}

export async function deleteProductOption(id: string) {
  try {
    await (prisma as any).productOption?.delete({ where: { id } })
    revalidatePath('/admin/supplements')
    return { success: true }
  } catch (error) {
    console.error('deleteProductOption error:', error)
    return { success: false, error: 'Suppression impossible.' }
  }
}
