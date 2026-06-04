import React from 'react'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AdminCustomersClient } from '@/components/admin/AdminCustomersClient'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value

  const [totalCustomersCount, customers] = await Promise.all([
    prisma.customer.count({
      where: activeStoreId ? { storeId: activeStoreId } : undefined
    }),
    prisma.customer.findMany({
      where: activeStoreId ? { storeId: activeStoreId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        loyalty: true,
        orders: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            status: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  ])

  const averagePoints = customers.length > 0
    ? Math.round(customers.reduce((sum, c) => sum + (c.loyalty?.points || 0), 0) / customers.length)
    : 0

  async function refreshDataAction() {
    'use server'
    revalidatePath('/admin/clients')
  }

  return (
    <AdminCustomersClient 
      totalCustomersCount={totalCustomersCount}
      averagePoints={averagePoints}
      customers={customers}
      refreshDataAction={refreshDataAction}
      activeStoreId={activeStoreId}
    />
  )
}
