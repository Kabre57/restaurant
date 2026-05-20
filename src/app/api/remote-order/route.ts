import { NextResponse } from 'next/server'
import { DeliveryPlatform, Prisma } from '@prisma/client'
import {
  createExternalDeliveryOrder,
  getApiKeyFromRequest,
  IntegrationError,
  normalizePlatform,
  resolveExternalItems,
  resolveStoreForExternalOrder
} from '@/lib/external-orders'
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit'
import { formatZodError, remoteOrderSchema } from '@/lib/validation/schemas'

/**
 * API pour recevoir des commandes de plateformes externes (Glovo, UberEats, etc.)
 * Sécurisée par une clé API simple pour l'exemple.
 */
export async function POST(req: Request) {
  try {
    const limit = await checkRateLimit(rateLimitKey('remote-order', req), 60, 60)
    if (!limit.allowed) return rateLimitResponse(limit)

    const body = await req.json()
    const parsed = remoteOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }
    const {
      apiKey: bodyApiKey,
      platform: rawPlatform,
      externalOrderId,
      externalStoreId,
      storeId,
      items,
      customerName,
      customerPhone,
      deliveryAddress,
      customerNotes
    } = parsed.data

    const apiKey = getApiKeyFromRequest(req, bodyApiKey)
    if (!process.env.EXTERNAL_API_KEY || apiKey !== process.env.EXTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const platform = normalizePlatform(rawPlatform) || DeliveryPlatform.GENERIC

    if (!externalOrderId || typeof externalOrderId !== 'string') {
      throw new IntegrationError('externalOrderId est requis', 400)
    }

    const resolvedStore = await resolveStoreForExternalOrder({
      platform,
      storeId,
      externalStoreId
    })

    const resolvedItems = await resolveExternalItems(platform, resolvedStore.storeId, items)

    const result = await createExternalDeliveryOrder({
      platform,
      storeId: resolvedStore.storeId,
      externalStoreId: resolvedStore.externalStoreId,
      externalOrderId,
      customerName,
      customerPhone,
      deliveryAddress,
      customerNotes,
      externalPayload: body as Prisma.InputJsonValue,
      items: resolvedItems
    })

    return NextResponse.json({ 
      success: true, 
      orderId: result.order.id,
      replayed: result.replayed,
      message: 'Commande reçue et ajoutée à la file d\'attente'
    })

  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Erreur API Remote Order:', error)
    return NextResponse.json({ error: 'Échec du traitement de la commande' }, { status: 500 })
  }
}
