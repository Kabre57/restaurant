import React from 'react';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import CustomerOrderClient from '@/components/customer/CustomerOrderClient';
import { getProductsByStore, getCategoriesByStore } from '@/app/actions/products';
import { getProductOptions } from '@/app/actions/productOptions';

interface PageProps {
  params: Promise<{
    storeId: string;
    tableId: string;
  }>;
}

export default async function CustomerOrderPage({ params }: PageProps) {
  const { storeId, tableId } = await params;

  // Fetch store and table info
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true }
  });

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { id: true, number: true, storeId: true }
  });

  if (!store || !table || table.storeId !== storeId) {
    return notFound();
  }

  // Fetch products and categories
  const products = await getProductsByStore(storeId);
  const categories = await getCategoriesByStore(storeId);
  const productOptions = await getProductOptions(storeId);

  return (
    <CustomerOrderClient
      products={products as any}
      categories={categories}
      storeName={store.name}
      tableNumber={table.number}
      storeId={storeId}
      tableId={tableId}
      productOptions={productOptions}
    />
  );
}
