import { prisma } from '@/lib/db'
import type { StockConflictDetail } from '@/lib/offline-sync'

export type AvailableOrderProduct = {
  id: string
  name: string
  price: number
  averagePrepTimeMins: number
  trackStock: boolean
  stockQuantity: number
  minStockLevel: number
  priceHT: number | null
  taxRate: number | null
  priceTTC: number | null
}

export class StockConflictError extends Error {
  readonly reason = 'STOCK_INSUFFICIENT'
  readonly details: StockConflictDetail[]

  constructor(details: StockConflictDetail[]) {
    super('Stock insuffisant pour synchroniser la commande')
    this.name = 'StockConflictError'
    this.details = details
  }
}

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
      minStockLevel: true,
      priceHT: true,
      taxRate: true,
      priceTTC: true
    }
  })

  if (availableProducts.length !== productIds.length) {
    throw new Error("Un ou plusieurs produits ne sont plus disponibles")
  }

  const formattedProducts = availableProducts.map(p => ({
    ...p,
    priceHT: p.priceHT ? Number(p.priceHT) : null,
    taxRate: p.taxRate ? Number(p.taxRate) : null,
    priceTTC: p.priceTTC ? Number(p.priceTTC) : null,
  }))

  assertSufficientStock(items, formattedProducts)

  return formattedProducts
}

/**
 * Refuse une commande hors-ligne si le stock serveur courant ne peut plus la couvrir.
 */
export function assertSufficientStock(
  items: { productId: string; quantity: number }[],
  products: Pick<AvailableOrderProduct, 'id' | 'name' | 'trackStock' | 'stockQuantity'>[]
) {
  const productMap = new Map(products.map(product => [product.id, product]))
  const details = items.flatMap((item) => {
    const product = productMap.get(item.productId)
    if (!product?.trackStock || product.stockQuantity >= item.quantity) return []
    return [{
      productId: item.productId,
      name: product.name,
      requested: item.quantity,
      available: product.stockQuantity,
    }]
  })

  if (details.length > 0) {
    throw new StockConflictError(details)
  }
}
