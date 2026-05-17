import React from 'react'
import prisma from '@/lib/prisma'
import type { Category, Product } from '@prisma/client'
import { notFound } from 'next/navigation'
import CustomerOrderClient from '@/components/customer/CustomerOrderClient'
import { getProductsByStore, getCategoriesByStore } from '@/app/actions/products'

interface PageProps {
  params: Promise<{
    storeId: string
    tableId: string
  }>
}

export default async function TableMenuPage({ params }: PageProps) {
  const { storeId, tableId } = await params

  const [store, table] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true },
    }),
    prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, number: true, storeId: true },
    }),
  ])

  if (!store || !table || table.storeId !== storeId) {
    return notFound()
  }

  const [products, categories] = await Promise.all([
    getProductsByStore(storeId),
    getCategoriesByStore(storeId),
  ])

  return (
    <CustomerOrderClient
      products={products as (Product & { category: Category })[]}
      categories={categories}
      storeName={store.name}
      tableNumber={table.number}
      storeId={storeId}
      tableId={tableId}
    />
  )
}
