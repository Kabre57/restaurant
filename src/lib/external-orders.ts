import crypto from 'node:crypto'
import { DeliveryPlatform, OrderStatus, OrderType, Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { redis } from '@/lib/redis'

const orderInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  },
  deliveryPerson: true,
  payments: true
} satisfies Prisma.OrderInclude

type IncomingExternalItem = {
  productId?: string
  externalProductId?: string
  quantity?: number
  price?: number
  options?: string | null
}

type ResolvedExternalItem = {
  productId: string
  quantity: number
  price: number
  options?: string | null
}

type ResolveStoreInput = {
  platform: DeliveryPlatform
  storeId?: string | null
  externalStoreId?: string | null
}

type CreateExternalOrderInput = {
  platform: DeliveryPlatform
  storeId: string
  externalStoreId?: string | null
  externalOrderId: string
  customerName?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  customerNotes?: string | null
  externalPayload?: Prisma.InputJsonValue
  items: ResolvedExternalItem[]
}

export class IntegrationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeText(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function normalizePlatform(value?: string | null): DeliveryPlatform | null {
  if (!value) return null

  const normalized = value.trim().toUpperCase()

  if (normalized === 'GLOVO') return DeliveryPlatform.GLOVO
  if (normalized === 'UBER_EATS' || normalized === 'UBEREATS' || normalized === 'UBER_EAT') return DeliveryPlatform.UBER_EATS
  if (normalized === 'DELIVEROO') return DeliveryPlatform.DELIVEROO
  if (normalized === 'GENERIC' || normalized === 'REMOTE') return DeliveryPlatform.GENERIC

  return null
}

export function getApiKeyFromRequest(req: Request, fallbackBodyKey?: string): string | null {
  const headerKey = req.headers.get('x-api-key')
  if (headerKey) return headerKey

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }

  return fallbackBodyKey?.trim() || null
}

export function verifyHmacSignature(rawBody: string, signatureHeader: string | null, secret: string | undefined): boolean {
  if (!signatureHeader || !secret) return false

  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedVariants = [digest, `sha256=${digest}`]

  return expectedVariants.some((expected) => {
    const actualBuffer = Buffer.from(signatureHeader)
    const expectedBuffer = Buffer.from(expected)

    if (actualBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  })
}

export async function resolveStoreForExternalOrder({ platform, storeId, externalStoreId }: ResolveStoreInput) {
  if (externalStoreId) {
    const connection = await prisma.storePlatformConnection.findUnique({
      where: {
        platform_externalStoreId: {
          platform,
          externalStoreId
        }
      },
      select: {
        storeId: true,
        isActive: true
      }
    })

    if (!connection || !connection.isActive) {
      throw new IntegrationError('Etablissement externe inconnu ou désactivé', 404)
    }

    return { storeId: connection.storeId, externalStoreId }
  }

  if (!storeId) {
    throw new IntegrationError('Aucun établissement cible fourni', 400)
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true }
  })

  if (!store) {
    throw new IntegrationError('Etablissement introuvable', 404)
  }

  return { storeId: store.id, externalStoreId: null }
}

export async function resolveExternalItems(
  platform: DeliveryPlatform,
  storeId: string,
  rawItems: unknown
): Promise<ResolvedExternalItem[]> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new IntegrationError('La commande ne contient aucun article', 400)
  }

  const items = rawItems as IncomingExternalItem[]
  const externalIds = [...new Set(items.map((item) => item.externalProductId?.trim()).filter(Boolean))] as string[]
  const internalIds = [...new Set(items.map((item) => item.productId?.trim()).filter(Boolean))] as string[]

  const [mappedProducts, directProducts] = await Promise.all([
    externalIds.length
      ? prisma.productPlatformMapping.findMany({
          where: {
            storeId,
            platform,
            externalProductId: { in: externalIds }
          },
          include: {
            product: {
              select: {
                id: true,
                price: true,
                isAvailable: true
              }
            }
          }
        })
      : Promise.resolve([]),
    internalIds.length
      ? prisma.product.findMany({
          where: {
            id: { in: internalIds },
            storeId
          },
          select: {
            id: true,
            price: true,
            isAvailable: true
          }
        })
      : Promise.resolve([])
  ])

  const externalMap = new Map(mappedProducts.map((mapping) => [mapping.externalProductId, mapping.product]))
  const internalMap = new Map(directProducts.map((product) => [product.id, product]))

  return items.map((item, index) => {
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new IntegrationError(`Quantité invalide à la ligne ${index + 1}`, 422)
    }

    const options = normalizeText(item.options || null)
    const externalProductId = item.externalProductId?.trim()
    const directProductId = item.productId?.trim()
    const product = externalProductId
      ? externalMap.get(externalProductId)
      : directProductId
        ? internalMap.get(directProductId)
        : null

    if (!product) {
      throw new IntegrationError(`Produit introuvable à la ligne ${index + 1}`, 422)
    }

    if (!product.isAvailable) {
      throw new IntegrationError(`Produit indisponible à la ligne ${index + 1}`, 409)
    }

    return {
      productId: product.id,
      quantity,
      price: roundCurrency(product.price),
      options
    }
  })
}

async function publishStockAlert(storeId: string, product: { name: string; stockQuantity: number }) {
  try {
    await redis.publish(`store:${storeId}:stock-alert`, JSON.stringify(product))
  } catch (error) {
    console.error('Failed to publish stock alert:', error)
  }
}

async function publishOrderEvent(order: { storeId?: string | null }) {
  if (!order.storeId) return

  try {
    await redis.publish(`store:${order.storeId}:orders:new-order`, JSON.stringify(order))
  } catch (error) {
    console.error('Failed to publish external order event:', error)
  }
}

export async function createExternalDeliveryOrder(input: CreateExternalOrderInput) {
  const existingOrder = await prisma.order.findFirst({
    where: {
      sourcePlatform: input.platform,
      externalOrderId: input.externalOrderId
    },
    include: orderInclude
  })

  if (existingOrder) {
    return { success: true as const, order: existingOrder, replayed: true as const }
  }

  const computedTotal = roundCurrency(
    input.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  const clientRequestId = `external:${input.platform}:${input.externalOrderId}`

  try {
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          storeId: input.storeId,
          total: computedTotal,
          type: OrderType.DELIVERY,
          status: OrderStatus.EN_ATTENTE,
          clientRequestId,
          sourcePlatform: input.platform,
          externalOrderId: input.externalOrderId,
          externalStoreId: normalizeText(input.externalStoreId),
          customerName: normalizeText(input.customerName),
          customerPhone: normalizeText(input.customerPhone),
          deliveryAddress: normalizeText(input.deliveryAddress),
          customerNotes: normalizeText(input.customerNotes),
          externalPayload: input.externalPayload,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              options: item.options || null
            }))
          }
        },
        include: orderInclude
      })

      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            trackStock: true,
            stockQuantity: true,
            minStockLevel: true
          }
        })

        if (!product || !product.trackStock) {
          continue
        }

        const newQuantity = Math.max(0, product.stockQuantity - item.quantity)
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newQuantity }
        })

        if (newQuantity < product.minStockLevel) {
          await publishStockAlert(input.storeId, { name: product.name, stockQuantity: newQuantity })
        }
      }

      return createdOrder
    })

    await publishOrderEvent(order)

    return { success: true as const, order, replayed: false as const }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const replayedOrder = await prisma.order.findFirst({
        where: {
          sourcePlatform: input.platform,
          externalOrderId: input.externalOrderId
        },
        include: orderInclude
      })

      if (replayedOrder) {
        return { success: true as const, order: replayedOrder, replayed: true as const }
      }
    }

    throw error
  }
}
