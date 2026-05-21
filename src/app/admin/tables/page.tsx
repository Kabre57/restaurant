import React from 'react'
import prisma from '@/lib/prisma'
import AdminTablesClient from './AdminTablesClient'

export const dynamic = 'force-dynamic'

export default async function AdminTablesPage() {
  const [totalCount, occupiedCount, tables, stores] = await Promise.all([
    prisma.table.count(),
    prisma.table.count({ where: { status: 'OCCUPIED' } }),
    prisma.table.findMany({
      orderBy: { number: 'asc' },
      include: { store: { select: { id: true, name: true } } },
    }),
    prisma.store.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  // Group by store
  const groupMap = new Map<string, { storeId: string; storeName: string; items: typeof tables }>()
  for (const table of tables) {
    const existing = groupMap.get(table.store.id)
    if (existing) {
      existing.items.push(table)
    } else {
      groupMap.set(table.store.id, {
        storeId: table.store.id,
        storeName: table.store.name,
        items: [table],
      })
    }
  }

  const groups = Array.from(groupMap.values()).map((g) => ({
    storeId: g.storeId,
    storeName: g.storeName,
    items: g.items.map((t) => ({
      id: t.id,
      number: t.number,
      capacity: t.capacity,
      status: t.status,
      shape: t.shape,
      storeId: t.storeId,
    })),
  }))

  return (
    <AdminTablesClient
      groups={groups}
      totalCount={totalCount}
      occupiedCount={occupiedCount}
      storeOptions={stores}
    />
  )
}
