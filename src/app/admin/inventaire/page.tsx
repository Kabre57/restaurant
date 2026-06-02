import React from 'react'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { AdminInventoryClient } from '@/components/admin/AdminInventoryClient'

import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value

  const [totalIngredients, lowStockCount, inventories, stores] = await Promise.all([
    activeStoreId
      ? prisma.inventory.count({ where: { storeId: activeStoreId } })
      : prisma.ingredient.count(),
    prisma.inventory.count({
      where: {
        ...(activeStoreId ? { storeId: activeStoreId } : {}),
        quantity: {
          lt: prisma.inventory.fields.minStock
        }
      }
    }),
    prisma.inventory.findMany({
      where: activeStoreId ? { storeId: activeStoreId } : undefined,
      orderBy: { quantity: 'asc' },
      include: {
        ingredient: true,
        store: { select: { name: true } }
      }
    }),
    prisma.store.findMany({ select: { id: true, name: true } })
  ])

  async function refreshDataAction() {
    'use server'
    revalidatePath('/admin/inventaire')
  }

  return (
    <AdminInventoryClient 
      totalIngredients={totalIngredients}
      lowStockCount={lowStockCount}
      inventories={inventories}
      stores={stores}
      refreshDataAction={refreshDataAction}
    />
  )
}
