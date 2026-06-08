'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'
import { redis, REDIS_KEYS } from '@/lib/redis'
import { checkRecipeAvailability, deductRecipeIngredients } from './inventory'

export async function getProductsWithRecipes(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    const products = await prisma.product.findMany({
      where: { 
        storeId: targetStoreId,
        ingredients: {
          some: {}
        }
      },
      include: {
        ingredients: {
          include: {
            ingredientBase: true,
            ingredientProduct: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    return products
  } catch (error) {
    console.error("Failed to fetch products with recipes:", error)
    return []
  }
}

export async function getProductionHistory(storeId: string) {
  const { storeId: authStoreId, role } = await requireAuth()
  const targetStoreId = role === "ADMIN" ? storeId : authStoreId

  try {
    // Find ingredient movements related to production
    const movements = await prisma.ingredientMovement.findMany({
      where: {
        storeId: targetStoreId,
        note: {
          contains: "production de"
        }
      },
      include: {
        ingredient: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return movements
  } catch (error) {
    console.error("Failed to fetch production history:", error)
    return []
  }
}

export async function produceProductAction(data: {
  productId: string
  quantity: number
  storeId: string
}) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  const targetStoreId = role === "ADMIN" ? data.storeId : authStoreId

  try {
    const { productId, quantity } = data

    if (quantity <= 0) {
      return { success: false, error: "La quantité à produire doit être supérieure à 0." }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch product and ingredients
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          ingredients: true
        }
      })

      if (!product) {
        return { success: false, error: "Produit introuvable." }
      }

      assertSameStore(product.storeId, targetStoreId)

      if (product.ingredients.length === 0) {
        return { success: false, error: "Ce produit n'a pas de fiche technique (recette) configurée." }
      }

      // 2. Check ingredient inventory availability recursively
      const availability = await checkRecipeAvailability(tx, targetStoreId, productId, quantity)
      if (!availability.success) {
        return availability
      }

      // 3. Decrement ingredients recursively and log movements
      await deductRecipeIngredients(tx, targetStoreId, productId, quantity, `Consommé pour la production de ${quantity}x ${product.name}`)

      // 4. Increment product stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          trackStock: true,
          stockQuantity: {
            increment: quantity
          }
        }
      })

      // Invalidate redis cache for products
      await redis.del(REDIS_KEYS.products(targetStoreId))

      return { success: true, product: updatedProduct }
    })
  } catch (error) {
    console.error("Failed to execute production:", error)
    return { success: false, error: "Erreur technique lors de la production." }
  } finally {
    revalidatePath('/restaurateur/stocks/productions')
    revalidatePath('/restaurateur/produits')
  }
}
