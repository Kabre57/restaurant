import React from 'react'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import type { Category, Product } from '@prisma/client'
import CustomerOrderClient from '@/components/customer/CustomerOrderClient'
import { getProductsByStore, getCategoriesByStore } from '@/app/actions/products'

interface PageProps {
  params: Promise<{
    storeId: string
    tableId: string
  }>
}

function MenuAccessHelp({ storeId, tableId }: { storeId: string; tableId: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-10 text-[#212529]">
      <section className="w-full max-w-xl rounded-2xl border border-[#dee2e6] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#f08c00]">Carte/Menu par table</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Lien de table invalide</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-[#868e96]">
          La Carte/Menu client s’ouvre avec une URL réelle générée par le manager pour chaque table. Les valeurs
          <span className="font-black text-[#212529]"> [storeId] </span>
          et
          <span className="font-black text-[#212529]"> [tableId] </span>
          sont seulement des exemples de structure.
        </p>

        <div className="mt-5 rounded-xl border border-[#dee2e6] bg-[#f8f9fa] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Lien ouvert</p>
          <p className="mt-2 break-all text-xs font-black text-[#495057]">/menu/{storeId}/{tableId}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/restaurateur/tables"
            className="inline-flex items-center justify-center rounded-xl bg-[#212529] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
          >
            Configurer les tables
          </Link>
          <Link
            href="/espaces"
            className="inline-flex items-center justify-center rounded-xl border border-[#dee2e6] bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#212529]"
          >
            Voir les espaces
          </Link>
        </div>
      </section>
    </main>
  )
}

export default async function TableMenuPage({ params }: PageProps) {
  const { storeId, tableId } = await params
  const isPlaceholderUrl = storeId.includes('[') || tableId.includes('[')

  if (isPlaceholderUrl) {
    return <MenuAccessHelp storeId={storeId} tableId={tableId} />
  }

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
    return <MenuAccessHelp storeId={storeId} tableId={tableId} />
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
