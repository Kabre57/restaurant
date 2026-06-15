'use server'

import { revalidatePath } from 'next/cache'
import { IngMvtReason } from '@prisma/client'
import { 
  createIngredientSchema, 
  updateInventorySchema, 
  formatZodError 
} from '@/lib/validation/schemas'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'
import { InventoryRepository } from '@/modules/inventory/repositories/inventory.repository'
import { runInTransaction, TransactionClient } from '@/infrastructure/prisma/transaction'

export async function createIngredient(data: {
  storeId: string
  name: string
  unit: string
  quantity: number
  minStock: number
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])
  const finalStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const parsed = createIngredientSchema.safeParse({ ...data, storeId: finalStoreId })
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    // Upsert the ingredient to avoid duplicates
    let ingredient = await InventoryRepository.findIngredientByNameAndStore(validatedData.name, finalStoreId)

    if (!ingredient) {
      ingredient = await InventoryRepository.createIngredient({
        name: validatedData.name.trim(),
        unit: validatedData.unit.trim(),
        storeId: finalStoreId
      })
    }

    // Check if it already exists in inventory
    const existingInventory = await InventoryRepository.findInventoryByStoreAndIngredient(finalStoreId, ingredient.id)

    if (existingInventory) {
      return { success: false, error: 'Cet ingrédient existe déjà dans l\'inventaire du restaurant.' }
    }

    const inventory = await InventoryRepository.createInventory({
      storeId: finalStoreId,
      ingredientId: ingredient.id,
      quantity: validatedData.quantity,
      minStock: validatedData.minStock
    })

    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
    return { success: true, inventory }
  } catch (error) {
    console.error("Failed to create ingredient:", error)
    return { success: false, error: "Impossible de créer l'ingrédient." }
  }
}

export async function updateInventory(id: string, quantity: number, minStock: number) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await InventoryRepository.findInventoryById(id)
    if (!existing) return { success: false, error: "Inventaire non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const parsed = updateInventorySchema.safeParse({ quantity, minStock })
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const updated = await InventoryRepository.updateInventory(id, {
      quantity: validatedData.quantity,
      minStock: validatedData.minStock,
      lastUpdated: new Date()
    })
    
    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
    return { success: true, inventory: updated }
  } catch (error) {
    console.error("Failed to update inventory:", error)
    return { success: false, error: "Impossible de mettre à jour le stock." }
  }
}

export async function deleteInventory(id: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await InventoryRepository.findInventoryById(id)
    if (!existing) return { success: false, error: "Inventaire non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await InventoryRepository.deleteInventory(id)
    
    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete inventory:", error)
    return { success: false, error: "Impossible de supprimer l'élément de l'inventaire." }
  }
}

export async function checkRecipeAvailability(
  tx: TransactionClient,
  storeId: string,
  productId: string,
  quantityNeeded: number,
  visited = new Set<string>()
): Promise<{ success: boolean; error?: string }> {
  if (visited.has(productId)) {
    return { success: true };
  }
  visited.add(productId);

  const mappings = await InventoryRepository.findProductIngredients(productId, tx);

  for (const mapping of mappings) {
    const totalNeeded = mapping.quantity * quantityNeeded;
    if (mapping.isSubRecipe) {
      const subProd = await InventoryRepository.findProductById(mapping.ingredientId, tx);
      if (!subProd) {
        return { success: false, error: `Sous-recette introuvable pour ${mapping.ingredientId}` };
      }

      let remainingNeeded = totalNeeded;
      if (subProd.trackStock && subProd.stockQuantity > 0) {
        remainingNeeded = Math.max(0, totalNeeded - subProd.stockQuantity);
      }

      if (remainingNeeded > 0) {
        const subRes = await checkRecipeAvailability(tx, storeId, mapping.ingredientId, remainingNeeded, new Set(visited));
        if (!subRes.success) {
          return subRes;
        }
      }
    } else {
      const inventory = await InventoryRepository.findInventoryByStoreAndIngredient(storeId, mapping.ingredientId, tx);
      if (!inventory || inventory.quantity < totalNeeded) {
        const currentQty = inventory ? inventory.quantity : 0;
        const ingName = mapping.ingredientBase?.name || "Ingrédient inconnu";
        const ingUnit = mapping.ingredientBase?.unit || "";
        return {
          success: false,
          error: `Stock insuffisant pour l'ingrédient '${ingName}'. Requis: ${totalNeeded} ${ingUnit}, Disponible: ${currentQty} ${ingUnit}.`
        };
      }
    }
  }

  return { success: true };
}

export async function deductRecipeIngredients(
  tx: TransactionClient,
  storeId: string,
  productId: string,
  quantityNeeded: number,
  note?: string,
  visited = new Set<string>()
) {
  if (visited.has(productId)) return;
  visited.add(productId);

  const mappings = await InventoryRepository.findProductIngredients(productId, tx);

  for (const mapping of mappings) {
    const totalNeeded = mapping.quantity * quantityNeeded;
    if (mapping.isSubRecipe) {
      const subProd = await InventoryRepository.findProductById(mapping.ingredientId, tx);

      let remainingNeeded = totalNeeded;
      if (subProd && subProd.trackStock && subProd.stockQuantity > 0) {
        const available = Math.min(subProd.stockQuantity, totalNeeded);
        await InventoryRepository.updateProductStockQuantity(mapping.ingredientId, {
          decrement: available
        }, tx);
        remainingNeeded = totalNeeded - available;
      }

      if (remainingNeeded > 0) {
        await deductRecipeIngredients(tx, storeId, mapping.ingredientId, remainingNeeded, note, new Set(visited));
      }
    } else {
      const inventory = await InventoryRepository.findInventoryByStoreAndIngredient(storeId, mapping.ingredientId, tx);

      if (inventory) {
        const newQuantity = Math.max(0, inventory.quantity - totalNeeded);
        await InventoryRepository.updateInventory(inventory.id, {
          quantity: newQuantity,
          lastUpdated: new Date()
        }, tx);

        // Log ingredient movement for audit
        await InventoryRepository.createIngredientMovement({
          storeId,
          ingredientId: mapping.ingredientId,
          quantity: -totalNeeded,
          reason: IngMvtReason.ADJUSTMENT_CORRECTION,
          note: note || `Consommé pour la recette du produit (ID: ${productId})`
        }, tx);
      }
    }
  }
}

export async function decrementIngredientInventory(tx: TransactionClient, storeId: string, productId: string, itemQuantity: number) {
  await deductRecipeIngredients(tx, storeId, productId, itemQuantity);
}

export async function incrementRecipeIngredients(
  tx: TransactionClient,
  storeId: string,
  productId: string,
  quantityToRestore: number,
  visited = new Set<string>()
) {
  if (visited.has(productId)) return;
  visited.add(productId);

  const mappings = await InventoryRepository.findProductIngredients(productId, tx);

  for (const mapping of mappings) {
    const totalToRestore = mapping.quantity * quantityToRestore;
    if (mapping.isSubRecipe) {
      const subProd = await InventoryRepository.findProductById(mapping.ingredientId, tx);
      if (subProd && subProd.trackStock) {
        await InventoryRepository.updateProductStockQuantity(mapping.ingredientId, {
          increment: totalToRestore
        }, tx);
      } else {
        await incrementRecipeIngredients(tx, storeId, mapping.ingredientId, totalToRestore, new Set(visited));
      }
    } else {
      const inventory = await InventoryRepository.findInventoryByStoreAndIngredient(storeId, mapping.ingredientId, tx);

      if (inventory) {
        await InventoryRepository.updateInventory(inventory.id, {
          quantity: inventory.quantity + totalToRestore,
          lastUpdated: new Date()
        }, tx);
      }
    }
  }
}

export async function incrementIngredientInventory(tx: TransactionClient, storeId: string, productId: string, itemQuantity: number) {
  await incrementRecipeIngredients(tx, storeId, productId, itemQuantity);
}

export async function getInventoryByStore(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await InventoryRepository.findInventoriesByStore(targetStoreId)
  } catch (error) {
    console.error("Failed to fetch inventory by store:", error)
    return []
  }
}

export async function getProductRecipe(productId: string) {
  const { storeId: authStoreId, role } = await requireAuth()

  try {
    const product = await InventoryRepository.findProductById(productId)
    if (!product) return []
    if (role !== "ADMIN") {
      assertSameStore(product.storeId, authStoreId)
    }

    return await InventoryRepository.getProductRecipeOrdered(productId)
  } catch (error) {
    console.error("Failed to fetch product recipe:", error)
    return []
  }
}

export async function saveProductRecipe(
  productId: string,
  recipeItems: {
    ingredientId: string;
    quantity: number;
    unit: string;
    sectionGroup?: string | null;
    preparationNote?: string | null;
    isSubRecipe: boolean;
    displayOrder?: number;
  }[]
) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const product = await InventoryRepository.findProductById(productId)
    if (!product) return { success: false, error: "Produit non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(product.storeId, authStoreId)
    }

    return await runInTransaction(async (tx) => {
      // 1. Delete existing recipe mappings
      await InventoryRepository.deleteProductIngredients(productId, tx)

      // 2. Create new recipe mappings
      if (recipeItems.length > 0) {
        await InventoryRepository.createManyProductIngredients(
          recipeItems.map((item) => ({
            productId,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            sectionGroup: item.sectionGroup || null,
            preparationNote: item.preparationNote || null,
            isSubRecipe: item.isSubRecipe,
            displayOrder: item.displayOrder || 0
          })),
          tx
        )
      }

      revalidatePath('/admin/inventaire')
      revalidatePath('/restaurateur/stocks')
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to save product recipe:", error)
    return { success: false, error: "Impossible d'enregistrer la fiche technique." }
  }
}

export async function getAllIngredients(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? (storeId || authStoreId) : authStoreId

  try {
    return await InventoryRepository.findIngredientsByStore(targetStoreId)
  } catch (error) {
    console.error("Failed to fetch all ingredients:", error)
    return []
  }
}

export async function transferStockAction(data: {
  sourceStoreId: string
  destStoreId: string
  ingredientId: string
  quantity: number
  note?: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])
  if (role !== "ADMIN") {
    assertSameStore(data.sourceStoreId, authStoreId, "Magasin source")
  }

  try {
    const { sourceStoreId, destStoreId, ingredientId, quantity, note } = data

    if (sourceStoreId === destStoreId) {
      return { success: false, error: "Le magasin source et destination doivent être différents." }
    }

    if (quantity <= 0) {
      return { success: false, error: "La quantité à transférer doit être supérieure à 0." }
    }

    return await runInTransaction(async (tx) => {
      // 1. Check source inventory
      const sourceInv = await InventoryRepository.findInventoryByStoreAndIngredient(sourceStoreId, ingredientId, tx)

      if (!sourceInv || sourceInv.quantity < quantity) {
        return { success: false, error: "Stock insuffisant dans le magasin source." }
      }

      // 2. Decrement source inventory
      await InventoryRepository.updateInventory(sourceInv.id, {
        quantity: sourceInv.quantity - quantity,
        lastUpdated: new Date()
      }, tx)

      // 3. Increment or Create destination inventory
      let destInv = await InventoryRepository.findInventoryByStoreAndIngredient(destStoreId, ingredientId, tx)

      if (!destInv) {
        destInv = await InventoryRepository.createInventory({
          storeId: destStoreId,
          ingredientId,
          quantity: quantity,
          minStock: sourceInv.minStock
        }, tx)
      } else {
        await InventoryRepository.updateInventory(destInv.id, {
          quantity: destInv.quantity + quantity,
          lastUpdated: new Date()
        }, tx)
      }

      // 4. Log movements
      await InventoryRepository.createIngredientMovement({
        storeId: sourceStoreId,
        ingredientId,
        quantity: -quantity,
        reason: IngMvtReason.TRANSFER_OUT,
        note: note || `Transfert vers magasin ${destStoreId}`
      }, tx)

      await InventoryRepository.createIngredientMovement({
        storeId: destStoreId,
        ingredientId,
        quantity: quantity,
        reason: IngMvtReason.TRANSFER_IN,
        note: note || `Transfert depuis magasin ${sourceStoreId}`
      }, tx)

      return { success: true }
    })
  } catch (error) {
    console.error("Failed to transfer stock:", error)
    return { success: false, error: "Erreur technique lors du transfert de stock." }
  } finally {
    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
  }
}

export async function adjustStockAction(data: {
  storeId: string
  ingredientId: string
  quantity: number // value depends on type
  type: 'SET' | 'DELTA'
  reason: IngMvtReason
  note?: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])
  const targetStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const { ingredientId, quantity, type, reason, note } = data

    return await runInTransaction(async (tx) => {
      let inv = await InventoryRepository.findInventoryByStoreAndIngredient(targetStoreId, ingredientId, tx)

      if (!inv) {
        inv = await InventoryRepository.createInventory({
          storeId: targetStoreId,
          ingredientId,
          quantity: 0,
          minStock: 5
        }, tx)
      }

      let delta = 0
      let newQuantity = inv.quantity

      if (type === 'SET') {
        delta = quantity - inv.quantity
        newQuantity = quantity
      } else {
        delta = quantity
        newQuantity = Math.max(0, inv.quantity + quantity)
      }

      await InventoryRepository.updateInventory(inv.id, {
        quantity: newQuantity,
        lastUpdated: new Date()
      }, tx)

      // Log movement
      await InventoryRepository.createIngredientMovement({
        storeId: targetStoreId,
        ingredientId,
        quantity: delta,
        reason,
        note
      }, tx)

      return { success: true }
    })
  } catch (error) {
    console.error("Failed to adjust stock:", error)
    return { success: false, error: "Erreur technique lors de l'ajustement du stock." }
  } finally {
    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
  }
}

export async function getInventoryValuationReport(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    const inventories = await InventoryRepository.findInventoriesWithValuation(targetStoreId)

    let totalCostValue = 0
    let totalPotentialSellValue = 0

    const items = inventories.map(inv => {
      const costPrice = inv.ingredient.costPrice || 0.0
      const sellPrice = inv.ingredient.sellPrice || 0.0
      const costValue = inv.quantity * costPrice
      const sellValue = inv.quantity * sellPrice
      const potentialProfit = sellValue - costValue

      totalCostValue += costValue
      totalPotentialSellValue += sellValue

      return {
        id: inv.id,
        ingredientName: inv.ingredient.name,
        storeName: inv.store.name,
        quantity: inv.quantity,
        unit: inv.ingredient.unit,
        costPrice,
        sellPrice,
        costValue,
        sellValue,
        potentialProfit
      }
    })

    return {
      items,
      totalCostValue,
      totalPotentialSellValue,
      totalPotentialProfit: totalPotentialSellValue - totalCostValue
    }
  } catch (error) {
    console.error("Failed to get valuation report:", error)
    return {
      items: [],
      totalCostValue: 0,
      totalPotentialSellValue: 0,
      totalPotentialProfit: 0
    }
  }
}

export async function getIngredientMovements(storeId?: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await InventoryRepository.findIngredientMovements(targetStoreId)
  } catch (error) {
    console.error("Failed to fetch ingredient movements:", error)
    return []
  }
}

export async function updateIngredientPrices(ingredientId: string, costPrice: number, sellPrice: number) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await InventoryRepository.findIngredientById(ingredientId)
    if (!existing) return { success: false, error: "Ingrédient non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await InventoryRepository.updateIngredient(ingredientId, {
      costPrice,
      sellPrice
    })
    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
    return { success: true }
  } catch (error) {
    console.error("Failed to update ingredient prices:", error)
    return { success: false, error: "Impossible de mettre à jour les prix de l'ingrédient." }
  }
}
