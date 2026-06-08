'use server';

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

// --- Gestion des Fournisseurs ---

export async function getSuppliers() {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  return prisma.supplier.findMany({
    where: { storeId, isActive: true },
    orderBy: { name: 'asc' }
  });
}

export async function createSupplier(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  taxId?: string;
  notes?: string;
}) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  const supplier = await prisma.supplier.create({
    data: {
      ...data,
      storeId
    }
  });
  revalidatePath('/restaurateur/stocks/purchase-orders');
  return supplier;
}

// --- Gestion des Bons de Commande ---

export async function getPurchaseOrders() {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  return prisma.purchaseOrder.findMany({
    where: { storeId },
    include: {
      supplier: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  expectedDate?: Date;
  notes?: string;
  items: { productId: string; quantity: number; unitCost: number }[];
}) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  // Générer numéro unique
  const poNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const subtotal = data.items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
  const taxAmount = subtotal * 0.18; // TVA 18% CI
  const totalAmount = subtotal + taxAmount;
  
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      storeId,
      supplierId: data.supplierId,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes: data.notes,
      subtotal,
      taxAmount,
      totalAmount,
      items: {
        create: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost
        }))
      }
    },
    include: { items: true, supplier: true }
  });
  
  revalidatePath('/restaurateur/stocks/purchase-orders');
  return purchaseOrder;
}

export async function receivePurchaseOrder(poId: string) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: poId, storeId },
    include: { items: true }
  });
  
  if (!purchaseOrder) throw new Error('Bon de commande non trouvé');
  if (purchaseOrder.status === 'RECEIVED') throw new Error('Bon de commande déjà réceptionné');
  
  // Mettre à jour les stocks
  for (const item of purchaseOrder.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stockQuantity: { increment: item.quantity },
        // Enregistrer le coût d'achat pour évaluation
        costPrice: item.unitCost
      }
    });
    
    // Enregistrer le mouvement de stock
    await prisma.stockMovement.create({
      data: {
        productId: item.productId,
        storeId,
        quantity: item.quantity,
        reason: 'DELIVERY',
        referenceId: poId,
        note: `Réception commande fournisseur ${purchaseOrder.poNumber}`
      }
    });
  }
  
  // Marquer comme reçu
  const received = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'RECEIVED',
      receivedDate: new Date()
    }
  });
  
  revalidatePath('/restaurateur/stocks/purchase-orders');
  return received;
}
