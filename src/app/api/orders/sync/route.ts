import { NextResponse } from 'next/server'
import { syncBatchSchema } from '@/lib/offline-sync'
import { syncOrdersBatch } from '@/app/actions/orders/orders'

function extractOrdersPayload(body: unknown) {
  if (Array.isArray(body)) return body
  if (typeof body === 'object' && body !== null && 'orders' in body) {
    return (body as { orders?: unknown }).orders
  }
  return body
}

/**
 * @openapi
 * /api/orders/sync:
 *   post:
 *     summary: Synchronise un lot de commandes POS créées hors-ligne.
 *     description: Retourne un statut par commande afin qu'un échec ne bloque pas le lot complet.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: array
 *                 items:
 *                   type: object
 *                   required: [storeId, type, items]
 *                   properties:
 *                     clientRequestId:
 *                       type: string
 *                     storeId:
 *                       type: string
 *                     cashierId:
 *                       type: string
 *                     serverId:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [DINE_IN, TAKEAWAY, DELIVERY]
 *                     paymentMode:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                       enum: [PAID, PENDING, EN_ATTENTE, REUSSIE, REUSSI, ECHOUEE, REMBOURSEE]
 *                     tableId:
 *                       type: string
 *                     discount:
 *                       type: number
 *                     promotionId:
 *                       type: string
 *                     customerId:
 *                       type: string
 *                     loyaltyPointsRedeemed:
 *                       type: integer
 *                     externalPayload:
 *                       type: object
 *                       additionalProperties: true
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [productId, quantity]
 *                         properties:
 *                           productId:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                             minimum: 1
 *                           price:
 *                             type: number
 *                           options:
 *                             type: string
 *               - type: object
 *                 required: [orders]
 *                 properties:
 *                   orders:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       200:
 *         description: Résultat de synchronisation par commande.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       clientRequestId:
 *                         type: string
 *                       orderId:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [SYNCED, REPLAYED, CONFLICT, FAILED]
 *                       reason:
 *                         type: string
 *                         enum: [STOCK_INSUFFICIENT, VALIDATION_FAILED, UNKNOWN]
 *                       error:
 *                         type: string
 *       400:
 *         description: Corps JSON invalide ou lot non conforme au contrat de synchronisation.
 */
export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = syncBatchSchema.safeParse(extractOrdersPayload(body))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Lot de synchronisation invalide', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const results = await syncOrdersBatch(parsed.data)
  return NextResponse.json({ results })
}
