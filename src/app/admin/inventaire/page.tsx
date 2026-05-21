import React from 'react'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { AdminInventoryClient } from '@/components/admin/AdminInventoryClient'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  const [totalIngredients, lowStockCount, inventories, stores] = await Promise.all([
    prisma.ingredient.count(),
    prisma.inventory.count({
      where: {
        quantity: {
          lt: prisma.inventory.fields.minStock
        }
      }
    }),
    prisma.inventory.findMany({
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
