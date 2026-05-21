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
