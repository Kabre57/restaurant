import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { Prisma } from '@prisma/client';

export interface IInventoryRepository {
  findIngredientByNameAndStore(name: string, storeId: string, tx?: TransactionClient): Promise<any>;
  createIngredient(data: Prisma.IngredientUncheckedCreateInput | { name: string; unit: string; storeId: string }, tx?: TransactionClient): Promise<any>;
  findInventoryByStoreAndIngredient(storeId: string, ingredientId: string, tx?: TransactionClient): Promise<any>;
  createInventory(data: Prisma.InventoryUncheckedCreateInput | { storeId: string; ingredientId: string; quantity: number; minStock: number }, tx?: TransactionClient): Promise<any>;
  findInventoryById(id: string, tx?: TransactionClient): Promise<any>;
  updateInventory(id: string, data: Prisma.InventoryUpdateInput, tx?: TransactionClient): Promise<any>;
  deleteInventory(id: string, tx?: TransactionClient): Promise<any>;
  findProductIngredients(productId: string, tx?: TransactionClient): Promise<any[]>;
  findProductById(productId: string, tx?: TransactionClient): Promise<any>;
  updateProductStockQuantity(productId: string, data: Prisma.ProductUpdateInput, tx?: TransactionClient): Promise<any>;
  createIngredientMovement(data: Prisma.IngredientMovementUncheckedCreateInput | { storeId: string; ingredientId: string; quantity: number; reason: any; note?: string }, tx?: TransactionClient): Promise<any>;
  findInventoriesByStore(storeId: string, tx?: TransactionClient): Promise<any[]>;
  getProductRecipeOrdered(productId: string, tx?: TransactionClient): Promise<any[]>;
  deleteProductIngredients(productId: string, tx?: TransactionClient): Promise<any>;
  createManyProductIngredients(data: any[], tx?: TransactionClient): Promise<any>;
  findIngredientsByStore(storeId: string, tx?: TransactionClient): Promise<any[]>;
  findInventoriesWithValuation(storeId?: string, tx?: TransactionClient): Promise<any[]>;
  findIngredientMovements(storeId?: string, tx?: TransactionClient): Promise<any[]>;
  findIngredientById(id: string, tx?: TransactionClient): Promise<any>;
  updateIngredient(id: string, data: Prisma.IngredientUpdateInput, tx?: TransactionClient): Promise<any>;
}
