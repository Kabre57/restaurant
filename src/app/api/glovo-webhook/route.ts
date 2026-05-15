import { NextResponse } from 'next/server'
import { DeliveryPlatform, Prisma } from '@prisma/client'
import {
  createExternalDeliveryOrder,
  IntegrationError,
  resolveExternalItems,
  resolveStoreForExternalOrder,
  verifyHmacSignature
} from '@/lib/external-orders'

/**
 * WEBHOOK GLOVO
 * Cet endpoint reçoit les commandes envoyées par les serveurs de Glovo.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-glovo-signature')

    if (!verifyHmacSignature(rawBody, signature, process.env.GLOVO_WEBHOOK_SECRET)) {
      return NextResponse.json({ status: 'REJECTED', error: 'Signature invalide' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const {
      order_code,
      store_id,
      items,
      customer_notes,
      customer: customerPayload,
      delivery_address
    } = body

    if (!order_code || typeof order_code !== 'string') {
      throw new IntegrationError('order_code manquant', 400)
    }

    if (!store_id || typeof store_id !== 'string') {
      throw new IntegrationError('store_id manquant', 400)
    }

    const { storeId, externalStoreId } = await resolveStoreForExternalOrder({
      platform: DeliveryPlatform.GLOVO,
      externalStoreId: store_id
    })

    const resolvedItems = await resolveExternalItems(DeliveryPlatform.GLOVO, storeId, items)

    const customerName = [customerPayload?.first_name, customerPayload?.last_name].filter(Boolean).join(' ').trim()
    const customerPhone = customerPayload?.phone || null

    const result = await createExternalDeliveryOrder({
      platform: DeliveryPlatform.GLOVO,
      storeId,
      externalStoreId,
      externalOrderId: order_code,
      customerName,
      customerPhone,
      deliveryAddress: delivery_address || null,
      customerNotes: customer_notes || null,
      externalPayload: body as Prisma.InputJsonValue,
      items: resolvedItems
    })

    return NextResponse.json({
      status: "ACCEPTED",
      order_id: result.order.id,
      replayed: result.replayed
    }, { status: 200 })

  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ status: 'REJECTED', error: error.message }, { status: error.status })
    }

    console.error('Erreur Webhook Glovo:', error)
    return NextResponse.json({ status: "REJECTED" }, { status: 500 })
  }
}
