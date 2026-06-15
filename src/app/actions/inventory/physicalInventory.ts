'use server';

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export async function getPhysicalInventories() {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  return prisma.physicalInventory.findMany({
    where: { storeId },
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createPhysicalInventory(data: {
  name: string;
  items: { productId: string; expectedQuantity: number }[];
}) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  const inventory = await prisma.physicalInventory.create({
    data: {
      name: data.name,
      storeId,
      status: 'DRAFT',
      items: {
        create: data.items.map(item => ({
          productId: item.productId,
          expectedQuantity: item.expectedQuantity
        }))
      }
    },
    include: { items: true }
  });
  
  revalidatePath('/restaurateur/stocks/physical-inventory');
  return inventory;
}

export async function updatePhysicalCount(
  inventoryId: string,
  items: { productId: string; countedQuantity: number; notes?: string }[]
) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  const inventory = await prisma.physicalInventory.findUnique({
    where: { id: inventoryId, storeId },
    include: { items: true }
  });
  
  if (!inventory) throw new Error('Inventaire non trouvé');
  if (inventory.status === 'COMPLETED') throw new Error('Inventaire déjà complété');
  
  // Mettre à jour les quantités comptées et différences
  for (const item of items) {
    const existingItem = inventory.items.find(i => i.productId === item.productId);
    if (existingItem) {
      const diff = item.countedQuantity - existingItem.expectedQuantity;
      await prisma.physicalInventoryItem.update({
        where: {
          physicalInventoryId_productId: {
            physicalInventoryId: inventoryId,
            productId: item.productId
          }
        },
        data: {
          countedQuantity: item.countedQuantity,
          difference: diff,
          notes: item.notes
        }
      });
    }
  }
  
  const updated = await prisma.physicalInventory.update({
    where: { id: inventoryId },
    data: {
      status: 'IN_PROGRESS'
    },
    include: { items: true }
  });
  
  revalidatePath('/restaurateur/stocks/physical-inventory');
  return updated;
}

export async function completePhysicalInventory(inventoryId: string) {
  const { storeId } = await requireAuth(['ADMIN', 'RESTAURATEUR']);
  
  const inventory = await prisma.physicalInventory.findUnique({
    where: { id: inventoryId, storeId },
    include: { items: true }
  });
  
  if (!inventory) throw new Error('Inventaire non trouvé');
  if (inventory.status === 'COMPLETED') throw new Error('Inventaire déjà complété');
  
  // Appliquer les ajustements de stock réels
  for (const item of inventory.items) {
    if (item.countedQuantity !== null && item.difference !== null) {
      // Mettre à jour le stock du produit avec la valeur réelle
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: Math.round(item.countedQuantity)
        }
      });
      
      // Enregistrer le mouvement de stock (différence)
      if (item.difference !== 0) {
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            storeId,
            quantity: item.difference,
            reason: item.difference < 0 ? 'WASTE' : 'ADJUSTMENT',
            referenceId: inventoryId,
            note: `Inventaire physique "${inventory.name}". Différence constatée: ${item.difference}`
          }
        });
      }
    }
  }
  
  const completed = await prisma.physicalInventory.update({
    where: { id: inventoryId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });
  
  revalidatePath('/restaurateur/stocks/physical-inventory');
  return completed;
}
