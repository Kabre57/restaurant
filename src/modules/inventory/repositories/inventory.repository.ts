import { prisma } from '@/infrastructure/prisma/client';
import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { Prisma, IngMvtReason } from '@prisma/client';

export class InventoryRepository {
  private static getClient(tx?: TransactionClient) {
    return tx || prisma;
  }

  static async findIngredientByNameAndStore(name: string, storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.ingredient.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        storeId
      }
    });
  }

  static async createIngredient(data: Prisma.IngredientUncheckedCreateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.ingredient.create({ data });
  }

  static async findInventoryByStoreAndIngredient(storeId: string, ingredientId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.inventory.findUnique({
      where: {
        storeId_ingredientId: {
          storeId,
          ingredientId
        }
      }
    });
  }

  static async createInventory(data: Prisma.InventoryUncheckedCreateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.inventory.create({ data });
  }

  static async findInventoryById(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.inventory.findUnique({ where: { id } });
  }

  static async updateInventory(id: string, data: Prisma.InventoryUpdateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.inventory.update({
      where: { id },
      data
    });
  }

  static async deleteInventory(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.inventory.delete({ where: { id } });
  }

  static async findProductIngredients(productId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.productIngredient.findMany({
      where: { productId },
      include: {
        ingredientBase: true,
        ingredientProduct: true
      }
    });
  }

  static async findProductById(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.product.findUnique({ where: { id } });
  }

  static async updateProductStockQuantity(id: string, change: { increment?: number; decrement?: number }, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.product.update({
      where: { id },
      data: {
        stockQuantity: change
      }
    });
  }

  static async createIngredientMovement(data: Prisma.IngredientMovementUncheckedCreateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.ingredientMovement.create({ data });
  }

  static async findInventoriesByStore(storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.inventory.findMany({
      where: { storeId },
      include: {
        ingredient: true
      },
      orderBy: {
        ingredient: {
          name: 'asc'
        }
      }
    });
  }

  static async getProductRecipeOrdered(productId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.productIngredient.findMany({
      where: { productId },
      include: {
        ingredientBase: true,
        ingredientProduct: true
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });
  }

  static async deleteProductIngredients(productId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.productIngredient.deleteMany({ where: { productId } });
  }

  static async createManyProductIngredients(data: Prisma.ProductIngredientCreateManyInput[], tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.productIngredient.createMany({ data });
  }

  static async findIngredientsByStore(storeId?: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.ingredient.findMany({
      where: storeId ? { storeId } : undefined,
      orderBy: { name: 'asc' }
    });
  }

  static async findInventoriesWithValuation(storeId?: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.inventory.findMany({
      where: storeId ? { storeId } : undefined,
      include: {
        ingredient: true,
        store: { select: { name: true } }
      }
    });
  }

  static async findIngredientMovements(storeId?: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.ingredientMovement.findMany({
      where: storeId ? { storeId } : undefined,
      include: {
        ingredient: true,
        store: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findIngredientById(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.ingredient.findUnique({ where: { id } });
  }

  static async updateIngredient(id: string, data: Prisma.IngredientUpdateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.ingredient.update({
      where: { id },
      data
    });
  }
}
