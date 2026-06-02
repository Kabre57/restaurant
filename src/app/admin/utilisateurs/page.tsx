import React from 'react'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { AdminUsersClient } from '@/components/admin/AdminUsersClient'

import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value

  const whereCondition = activeStoreId ? { storeId: activeStoreId } : {}

  const [totalStaffCount, cashierCount, kitchenCount, users, stores] = await Promise.all([
    prisma.user.count({ where: whereCondition }),
    prisma.user.count({ where: { ...whereCondition, role: 'CASHIER' } }),
    prisma.user.count({ where: { ...whereCondition, role: 'KITCHEN' } }),
    prisma.user.findMany({
      where: whereCondition,
      orderBy: { role: 'asc' },
      include: {
        store: { select: { name: true } }
      }
    }),
    prisma.store.findMany({ select: { id: true, name: true } })
  ])

  async function refreshDataAction() {
    'use server'
    revalidatePath('/admin/utilisateurs')
  }

  return (
    <AdminUsersClient 
      totalStaffCount={totalStaffCount}
      cashierCount={cashierCount}
      kitchenCount={kitchenCount}
      users={users}
      stores={stores}
      refreshDataAction={refreshDataAction}
    />
  )
}
