'use server';

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';

export async function getInventoryValuation(storeId?: string) {
  const { storeId: userStoreId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  const targetStoreId = storeId || userStoreId;
  
  const products = await prisma.product.findMany({
    where: { storeId: targetStoreId },
    include: { category: true }
  });
  
  const valuation = products.map(product => {
    const cost = product.costPrice || 0;
    const price = product.price || 0;
    const qty = product.stockQuantity || 0;
    
    return {
      id: product.id,
      name: product.name,
      category: product.category?.name || 'Sans catégorie',
      stockQuantity: qty,
      costPrice: cost,
      sellingPrice: price,
      totalCost: qty * cost,
      totalValue: qty * price,
      potentialProfit: qty * (price - cost)
    };
  });
  
  const byCategory: Record<string, { totalCost: number; totalValue: number; totalProfit: number; count: number }> = {};
  
  valuation.forEach(p => {
    const cat = p.category;
    if (!byCategory[cat]) {
      byCategory[cat] = { totalCost: 0, totalValue: 0, totalProfit: 0, count: 0 };
    }
    byCategory[cat].totalCost += p.totalCost;
    byCategory[cat].totalValue += p.totalValue;
    byCategory[cat].totalProfit += p.potentialProfit;
    byCategory[cat].count += 1;
  });
  
  const summary = {
    totalCost: valuation.reduce((sum, p) => sum + p.totalCost, 0),
    totalValue: valuation.reduce((sum, p) => sum + p.totalValue, 0),
    totalProfit: valuation.reduce((sum, p) => sum + p.potentialProfit, 0),
    byCategory
  };
  
  return { valuation, summary };
}
