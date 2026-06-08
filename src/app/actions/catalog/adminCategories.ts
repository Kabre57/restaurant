'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { adminCategorySchema } from '@/lib/validation/schemas'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export async function getAdminCategories(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId
  const where = targetStoreId ? { storeId: targetStoreId } : {}

  try {
    return await prisma.category.findMany({
      where,
      orderBy: [{ store: { name: 'asc' } }, { name: 'asc' }],
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    })
  } catch (error) {
    console.error('Failed to fetch admin categories:', error)
    return []
  }
}

export async function createAdminCategory(data: { name: string; storeId: string; imageUrl?: string }) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const parsed = adminCategorySchema.safeParse({ ...data, storeId: finalStoreId })
    if (!parsed.success) {
      return { success: false, error: 'Données catégorie invalides.' }
    }

    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        storeId: finalStoreId,
        imageUrl: parsed.data.imageUrl?.trim() || null,
      },
    })

    revalidatePath('/admin/categories')
    return { success: true, category }
  } catch (error) {
    console.error('Failed to create admin category:', error)
    return { success: false, error: 'Impossible de créer la catégorie.' }
  }
}

export async function deleteAdminCategory(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) return { success: false, error: 'Catégorie introuvable.' }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const productCount = await prisma.product.count({ where: { categoryId: id } })
    if (productCount > 0) {
      return { success: false, error: 'Cette catégorie contient des produits.' }
    }

    await prisma.category.delete({ where: { id } })
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete admin category:', error)
    return { success: false, error: 'Impossible de supprimer la catégorie.' }
  }
}
