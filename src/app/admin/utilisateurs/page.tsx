import React from 'react'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { AdminUsersClient } from '@/components/admin/AdminUsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const [totalStaffCount, cashierCount, kitchenCount, users, stores] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CASHIER' } }),
    prisma.user.count({ where: { role: 'KITCHEN' } }),
    prisma.user.findMany({
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
