'use server';

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export async function getStores() {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  // Lister tous les autres stores
  return prisma.store.findMany({
    where: {
      id: { not: storeId }
    },
    orderBy: { name: 'asc' }
  });
}

export async function getTransferOrders() {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  return prisma.transferOrder.findMany({
    where: {
      OR: [
        { fromStoreId: storeId },
        { toStoreId: storeId }
      ]
    },
    include: {
      fromStore: true,
      toStore: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createTransferOrder(data: {
  toStoreId: string;
  notes?: string;
  items: { productId: string; quantity: number; unitCost: number }[];
}) {
  const { storeId, userId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  const transferNumber = `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const transferOrder = await prisma.transferOrder.create({
    data: {
      transferNumber,
      fromStoreId: storeId,
      toStoreId: data.toStoreId,
      requestedBy: userId || 'System',
      notes: data.notes,
      items: {
        create: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost
        }))
      }
    },
    include: { items: true }
  });
  
  revalidatePath('/restaurateur/stocks/transfers');
  return transferOrder;
}

export async function shipTransferOrder(transferId: string) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  const transfer = await prisma.transferOrder.findUnique({
    where: { id: transferId, fromStoreId: storeId },
    include: { items: true }
  });
  
  if (!transfer) throw new Error('Ordre de transfert non trouvé ou vous n\'êtes pas le magasin d\'origine');
  if (transfer.status !== 'PENDING') throw new Error('Le statut actuel ne permet pas l\'expédition');
  
  // Déduire les stocks du magasin d'origine
  for (const item of transfer.items) {
    // Vérifier le stock disponible
    const product = await prisma.product.findUnique({
      where: { id: item.productId }
    });
    if (!product || product.stockQuantity < item.quantity) {
      throw new Error(`Stock insuffisant pour le produit : ${product?.name || item.productId}`);
    }
    
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stockQuantity: { decrement: item.quantity }
      }
    });
    
    // Mouvement de stock de sortie
    await prisma.stockMovement.create({
      data: {
        productId: item.productId,
        storeId,
        quantity: -item.quantity,
        reason: 'TRANSFER_OUT',
        referenceId: transferId,
        note: `Expédition transfert inter-magasins ${transfer.transferNumber}`
      }
    });
  }
  
  const updated = await prisma.transferOrder.update({
    where: { id: transferId },
    data: {
      status: 'SHIPPED',
      shipDate: new Date()
    }
  });
  
  revalidatePath('/restaurateur/stocks/transfers');
  return updated;
}

export async function receiveTransferOrder(transferId: string) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  const transfer = await prisma.transferOrder.findUnique({
    where: { id: transferId, toStoreId: storeId },
    include: { items: { include: { product: true } } }
  });
  
  if (!transfer) throw new Error('Ordre de transfert non trouvé ou vous n\'êtes pas le magasin de destination');
  if (transfer.status !== 'SHIPPED') throw new Error('Le transfert n\'a pas encore été expédié');
  
  // Ajouter les stocks dans le magasin de destination
  for (const item of transfer.items) {
    // Trouver le produit correspondant dans ce magasin par code-barres ou par nom pour assurer le lien
    let destProduct = await prisma.product.findFirst({
      where: {
        storeId,
        OR: [
          item.product.barcode ? { barcode: item.product.barcode } : undefined,
          { name: item.product.name }
        ].filter(Boolean) as any
      }
    });
    
    // Si le produit n'existe pas dans le magasin cible, on le crée
    if (!destProduct) {
      destProduct = await prisma.product.create({
        data: {
          storeId,
          categoryId: item.product.categoryId, // Peut nécessiter une catégorie similaire, on réutilise le même ID ou une existante
          name: item.product.name,
          price: item.product.price,
          costPrice: item.unitCost,
          barcode: item.product.barcode,
          stockQuantity: item.quantity,
          trackStock: true
        }
      });
    } else {
      await prisma.product.update({
        where: { id: destProduct.id },
        data: {
          stockQuantity: { increment: item.quantity },
          costPrice: item.unitCost
        }
      });
    }
    
    // Mouvement de stock d'entrée
    await prisma.stockMovement.create({
      data: {
        productId: destProduct.id,
        storeId,
        quantity: item.quantity,
        reason: 'TRANSFER_IN',
        referenceId: transferId,
        note: `Réception transfert inter-magasins ${transfer.transferNumber}`
      }
    });
  }
  
  const updated = await prisma.transferOrder.update({
    where: { id: transferId },
    data: {
      status: 'RECEIVED',
      receiveDate: new Date()
    }
  });
  
  revalidatePath('/restaurateur/stocks/transfers');
  return updated;
}
