'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createIngredient(data: {
  storeId: string
  name: string
  unit: string
  quantity: number
  minStock: number
}) {
  try {
    if (!data.name || !data.unit) {
      return { success: false, error: 'Nom et Unité sont requis.' }
    }

    // Upsert the ingredient to avoid duplicates
    let ingredient = await prisma.ingredient.findFirst({
      where: { name: { equals: data.name.trim(), mode: 'insensitive' } }
    })

    if (!ingredient) {
      ingredient = await prisma.ingredient.create({
        data: {
          name: data.name.trim(),
          unit: data.unit.trim()
        }
      })
    }

    // Check if it already exists in inventory
    const existingInventory = await prisma.inventory.findUnique({
      where: {
        storeId_ingredientId: {
          storeId: data.storeId,
          ingredientId: ingredient.id
        }
      }
    })

    if (existingInventory) {
      return { success: false, error: 'Cet ingrédient existe déjà dans l\'inventaire du restaurant.' }
    }

    const inventory = await prisma.inventory.create({
      data: {
        storeId: data.storeId,
        ingredientId: ingredient.id,
        quantity: data.quantity,
        minStock: data.minStock
      }
    })

    revalidatePath('/admin/inventaire')
    return { success: true, inventory }
  } catch (error) {
    console.error("Failed to create ingredient:", error)
    return { success: false, error: "Impossible de créer l'ingrédient." }
  }
}

export async function updateInventory(id: string, quantity: number, minStock: number) {
  try {
    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        quantity,
        minStock,
        lastUpdated: new Date()
      }
    })
    
    revalidatePath('/admin/inventaire')
    return { success: true, inventory: updated }
  } catch (error) {
    console.error("Failed to update inventory:", error)
    return { success: false, error: "Impossible de mettre à jour le stock." }
  }
}

export async function deleteInventory(id: string) {
  try {
    await prisma.inventory.delete({
      where: { id }
    })
    
    revalidatePath('/admin/inventaire')
    return { success: true }
  } catch (error) {
    console.error("Failed to delete inventory:", error)
    return { success: false, error: "Impossible de supprimer l'élément de l'inventaire." }
  }
}

export async function decrementIngredientInventory(tx: any, storeId: string, productId: string, itemQuantity: number) {
  try {
    const mappings = await tx.productIngredient.findMany({
      where: { productId },
      include: { ingredient: true }
    })

    for (const mapping of mappings) {
      const totalNeeded = mapping.quantity * itemQuantity
      const inventory = await tx.inventory.findUnique({
        where: {
          storeId_ingredientId: {
            storeId,
            ingredientId: mapping.ingredientId
          }
        }
      })

      if (inventory) {
        const newQuantity = Math.max(0, inventory.quantity - totalNeeded)
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: newQuantity,
            lastUpdated: new Date()
          }
        })
      }
    }
  } catch (error) {
    console.error(`Failed to decrement ingredients for product ${productId}:`, error)
  }
}

export async function incrementIngredientInventory(tx: any, storeId: string, productId: string, itemQuantity: number) {
  try {
    const mappings = await tx.productIngredient.findMany({
      where: { productId }
    })

    for (const mapping of mappings) {
      const totalReturned = mapping.quantity * itemQuantity
      const inventory = await tx.inventory.findUnique({
        where: {
          storeId_ingredientId: {
            storeId,
            ingredientId: mapping.ingredientId
          }
        }
      })

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: inventory.quantity + totalReturned,
            lastUpdated: new Date()
          }
        })
      }
    }
  } catch (error) {
    console.error(`Failed to increment ingredients for product ${productId}:`, error)
  }
}

export async function getInventoryByStore(storeId: string) {
  try {
    return await prisma.inventory.findMany({
      where: { storeId },
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
  try {
    return await prisma.productIngredient.findMany({
      where: { productId },
      include: {
        ingredient: true
      }
    })
  } catch (error) {
    console.error("Failed to fetch product recipe:", error)
    return []
  }
}

export async function saveProductRecipe(productId: string, recipeItems: { ingredientId: string; quantity: number }[]) {
  try {
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
            quantity: item.quantity
          }))
        })
      }

      return { success: true }
    })
  } catch (error) {
    console.error("Failed to save product recipe:", error)
    return { success: false, error: "Impossible d'enregistrer la fiche technique." }
  }
}

export async function getAllIngredients() {
  try {
    return await prisma.ingredient.findMany({
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error("Failed to fetch all ingredients:", error)
    return []
  }
}
