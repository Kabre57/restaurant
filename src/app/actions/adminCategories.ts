'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function getAdminCategories() {
  try {
    return await prisma.category.findMany({
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
  try {
    if (!data.name.trim() || !data.storeId) {
      return { success: false, error: 'Nom et restaurant requis.' }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name.trim(),
        storeId: data.storeId,
        imageUrl: data.imageUrl?.trim() || null,
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
  try {
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
