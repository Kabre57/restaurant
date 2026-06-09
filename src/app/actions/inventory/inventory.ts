'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { IngMvtReason, Prisma } from '@prisma/client'
import { 
  createIngredientSchema, 
  updateInventorySchema, 
  formatZodError 
} from '@/lib/validation/schemas'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

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
    let ingredient = await prisma.ingredient.findFirst({
      where: { 
        name: { equals: validatedData.name.trim(), mode: 'insensitive' },
        storeId: finalStoreId
      }
    })

    if (!ingredient) {
      ingredient = await prisma.ingredient.create({
        data: {
          name: validatedData.name.trim(),
          unit: validatedData.unit.trim(),
          storeId: finalStoreId
        }
      })
    }

    // Check if it already exists in inventory
    const existingInventory = await prisma.inventory.findUnique({
      where: {
        storeId_ingredientId: {
          storeId: finalStoreId,
          ingredientId: ingredient.id
        }
      }
    })

    if (existingInventory) {
      return { success: false, error: 'Cet ingrédient existe déjà dans l\'inventaire du restaurant.' }
    }

    const inventory = await prisma.inventory.create({
      data: {
        storeId: finalStoreId,
        ingredientId: ingredient.id,
        quantity: validatedData.quantity,
        minStock: validatedData.minStock
      }
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
    const existing = await prisma.inventory.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Inventaire non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    const parsed = updateInventorySchema.safeParse({ quantity, minStock })
    if (!parsed.success) {
      return { success: false, error: `Validation échouée: ${formatZodError(parsed.error)}` }
    }
    const validatedData = parsed.data

    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        quantity: validatedData.quantity,
        minStock: validatedData.minStock,
        lastUpdated: new Date()
      }
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
    const existing = await prisma.inventory.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Inventaire non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await prisma.inventory.delete({
      where: { id }
    })
    
    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete inventory:", error)
    return { success: false, error: "Impossible de supprimer l'élément de l'inventaire." }
  }
}

export async function checkRecipeAvailability(
  tx: Prisma.TransactionClient,
  storeId: string,
  productId: string,
  quantityNeeded: number,
  visited = new Set<string>()
): Promise<{ success: boolean; error?: string }> {
  if (visited.has(productId)) {
    return { success: true };
  }
  visited.add(productId);

  const mappings = await tx.productIngredient.findMany({
    where: { productId },
    include: {
      ingredientBase: true,
      ingredientProduct: true
    }
  });

  for (const mapping of mappings) {
    const totalNeeded = mapping.quantity * quantityNeeded;
    if (mapping.isSubRecipe) {
      const subProd = await tx.product.findUnique({
        where: { id: mapping.ingredientId }
      });
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
      const inventory = await tx.inventory.findUnique({
        where: {
          storeId_ingredientId: {
            storeId,
            ingredientId: mapping.ingredientId
          }
        }
      });
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
  tx: Prisma.TransactionClient,
  storeId: string,
  productId: string,
  quantityNeeded: number,
  note?: string,
  visited = new Set<string>()
) {
  if (visited.has(productId)) return;
  visited.add(productId);

  const mappings = await tx.productIngredient.findMany({
    where: { productId }
  });

  for (const mapping of mappings) {
    const totalNeeded = mapping.quantity * quantityNeeded;
    if (mapping.isSubRecipe) {
      const subProd = await tx.product.findUnique({
        where: { id: mapping.ingredientId }
      });

      let remainingNeeded = totalNeeded;
      if (subProd && subProd.trackStock && subProd.stockQuantity > 0) {
        const available = Math.min(subProd.stockQuantity, totalNeeded);
        await tx.product.update({
          where: { id: mapping.ingredientId },
          data: {
            stockQuantity: {
              decrement: available
            }
          }
        });
        remainingNeeded = totalNeeded - available;
      }

      if (remainingNeeded > 0) {
        await deductRecipeIngredients(tx, storeId, mapping.ingredientId, remainingNeeded, note, new Set(visited));
      }
    } else {
      const inventory = await tx.inventory.findUnique({
        where: {
          storeId_ingredientId: {
            storeId,
            ingredientId: mapping.ingredientId
          }
        }
      });

      if (inventory) {
        const newQuantity = Math.max(0, inventory.quantity - totalNeeded);
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: newQuantity,
            lastUpdated: new Date()
          }
        });

        // Log ingredient movement for audit
        await tx.ingredientMovement.create({
          data: {
            storeId,
            ingredientId: mapping.ingredientId,
            quantity: -totalNeeded,
            reason: IngMvtReason.ADJUSTMENT_CORRECTION,
            note: note || `Consommé pour la recette du produit (ID: ${productId})`
          }
        });
      }
    }
  }
}

export async function decrementIngredientInventory(tx: Prisma.TransactionClient, storeId: string, productId: string, itemQuantity: number) {
  await deductRecipeIngredients(tx, storeId, productId, itemQuantity);
}

export async function incrementRecipeIngredients(
  tx: Prisma.TransactionClient,
  storeId: string,
  productId: string,
  quantityToRestore: number,
  visited = new Set<string>()
) {
  if (visited.has(productId)) return;
  visited.add(productId);

  const mappings = await tx.productIngredient.findMany({
    where: { productId }
  });

  for (const mapping of mappings) {
    const totalToRestore = mapping.quantity * quantityToRestore;
    if (mapping.isSubRecipe) {
      const subProd = await tx.product.findUnique({
        where: { id: mapping.ingredientId }
      });
      if (subProd && subProd.trackStock) {
        await tx.product.update({
          where: { id: mapping.ingredientId },
          data: {
            stockQuantity: {
              increment: totalToRestore
            }
          }
        });
      } else {
        await incrementRecipeIngredients(tx, storeId, mapping.ingredientId, totalToRestore, new Set(visited));
      }
    } else {
      const inventory = await tx.inventory.findUnique({
        where: {
          storeId_ingredientId: {
            storeId,
            ingredientId: mapping.ingredientId
          }
        }
      });

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: inventory.quantity + totalToRestore,
            lastUpdated: new Date()
          }
        });
      }
    }
  }
}

export async function incrementIngredientInventory(tx: Prisma.TransactionClient, storeId: string, productId: string, itemQuantity: number) {
  await incrementRecipeIngredients(tx, storeId, productId, itemQuantity);
}

export async function getInventoryByStore(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    return await prisma.inventory.findMany({
      where: { storeId: targetStoreId },
      include: {
        ingredient: true
      },
      orderBy: {
        ingredient: {
          name: 'asc'
        }
      }
    })
  } catch (error) {
    console.error("Failed to fetch inventory by store:", error)
    return []
  }
}

export async function getProductRecipe(productId: string) {
  const { storeId: authStoreId, role } = await requireAuth()

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return []
    if (role !== "ADMIN") {
      assertSameStore(product.storeId, authStoreId)
    }

    return await prisma.productIngredient.findMany({
      where: { productId },
      include: {
        ingredientBase: true,
        ingredientProduct: true
      },
      orderBy: {
        displayOrder: 'asc'
      }
    })
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
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return { success: false, error: "Produit non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(product.storeId, authStoreId)
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete existing recipe mappings
      await tx.productIngredient.deleteMany({
        where: { productId }
      })

      // 2. Create new recipe mappings
      if (recipeItems.length > 0) {
        await tx.productIngredient.createMany({
          data: recipeItems.map((item) => ({
            productId,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            sectionGroup: item.sectionGroup || null,
            preparationNote: item.preparationNote || null,
            isSubRecipe: item.isSubRecipe,
            displayOrder: item.displayOrder || 0
          }))
        })
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
    return await prisma.ingredient.findMany({
      where: targetStoreId ? { storeId: targetStoreId } : undefined,
      orderBy: { name: 'asc' }
    })
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

    return await prisma.$transaction(async (tx) => {
      // 1. Check source inventory
      const sourceInv = await tx.inventory.findUnique({
        where: { storeId_ingredientId: { storeId: sourceStoreId, ingredientId } }
      })

      if (!sourceInv || sourceInv.quantity < quantity) {
        return { success: false, error: "Stock insuffisant dans le magasin source." }
      }

      // 2. Decrement source inventory
      await tx.inventory.update({
        where: { id: sourceInv.id },
        data: {
          quantity: sourceInv.quantity - quantity,
          lastUpdated: new Date()
        }
      })

      // 3. Increment or Create destination inventory
      let destInv = await tx.inventory.findUnique({
        where: { storeId_ingredientId: { storeId: destStoreId, ingredientId } }
      })

      if (!destInv) {
        destInv = await tx.inventory.create({
          data: {
            storeId: destStoreId,
            ingredientId,
            quantity: quantity,
            minStock: sourceInv.minStock
          }
        })
      } else {
        await tx.inventory.update({
          where: { id: destInv.id },
          data: {
            quantity: destInv.quantity + quantity,
            lastUpdated: new Date()
          }
        })
      }

      // 4. Log movements
      await tx.ingredientMovement.create({
        data: {
          storeId: sourceStoreId,
          ingredientId,
          quantity: -quantity,
          reason: IngMvtReason.TRANSFER_OUT,
          note: note || `Transfert vers magasin ${destStoreId}`
        }
      })

      await tx.ingredientMovement.create({
        data: {
          storeId: destStoreId,
          ingredientId,
          quantity: quantity,
          reason: IngMvtReason.TRANSFER_IN,
          note: note || `Transfert depuis magasin ${sourceStoreId}`
        }
      })

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

    return await prisma.$transaction(async (tx) => {
      let inv = await tx.inventory.findUnique({
        where: { storeId_ingredientId: { storeId: targetStoreId, ingredientId } }
      })

      if (!inv) {
        inv = await tx.inventory.create({
          data: {
            storeId: targetStoreId,
            ingredientId,
            quantity: 0,
            minStock: 5
          }
        })
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

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: newQuantity,
          lastUpdated: new Date()
        }
      })

      // Log movement
      await tx.ingredientMovement.create({
        data: {
          storeId: targetStoreId,
          ingredientId,
          quantity: delta,
          reason,
          note
        }
      })

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
    const inventories = await prisma.inventory.findMany({
      where: targetStoreId ? { storeId: targetStoreId } : undefined,
      include: {
        ingredient: true,
        store: { select: { name: true } }
      }
    })

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
    return await prisma.ingredientMovement.findMany({
      where: targetStoreId ? { storeId: targetStoreId } : undefined,
      include: {
        ingredient: true,
        store: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error("Failed to fetch ingredient movements:", error)
    return []
  }
}

export async function updateIngredientPrices(ingredientId: string, costPrice: number, sellPrice: number) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const existing = await prisma.ingredient.findUnique({ where: { id: ingredientId } })
    if (!existing) return { success: false, error: "Ingrédient non trouvé" }
    if (role !== "ADMIN") {
      assertSameStore(existing.storeId, authStoreId)
    }

    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        costPrice,
        sellPrice
      }
    })
    revalidatePath('/admin/inventaire')
    revalidatePath('/restaurateur/stocks')
    return { success: true }
  } catch (error) {
    console.error("Failed to update ingredient prices:", error)
    return { success: false, error: "Impossible de mettre à jour les prix de l'ingrédient." }
  }
}
