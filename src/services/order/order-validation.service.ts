import { prisma } from '@/lib/db'

/**
 * Valide la disponibilité des produits pour un magasin donné et retourne leurs caractéristiques.
 * Lève une erreur si certains produits ne sont pas disponibles.
 */
export async function validateProductsAvailability(
  storeId: string,
  items: { productId: string; quantity: number }[]
) {
  const productIds = [...new Set(items.map(item => item.productId))]
  const availableProducts = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      storeId,
      isAvailable: true
    },
    select: {
      id: true,
      name: true,
      price: true,
      averagePrepTimeMins: true,
      trackStock: true,
      stockQuantity: true,
      minStockLevel: true
    }
  })

  if (availableProducts.length !== productIds.length) {
    throw new Error("Un ou plusieurs produits ne sont plus disponibles")
  }

  return availableProducts
}
