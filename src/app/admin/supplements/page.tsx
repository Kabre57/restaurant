import React from 'react'
import { prisma } from '@/lib/db'
import AdminSupplementsClient from './AdminSupplementsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSupplementsPage() {
  // Load categories to allow linking options to categories
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, storeId: true, store: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  const stores = await prisma.store.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <AdminSupplementsClient categories={categories} stores={stores} />
  )
}
