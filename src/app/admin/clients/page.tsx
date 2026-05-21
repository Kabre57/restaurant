import React from 'react'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { AdminCustomersClient } from '@/components/admin/AdminCustomersClient'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  const [totalCustomersCount, customers] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        loyalty: true,
        orders: { select: { id: true, total: true } }
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
    />
  )
}
