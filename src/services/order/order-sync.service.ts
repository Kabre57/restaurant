import {
  normalizeSyncPaymentStatus,
  type StockConflictDetail,
  type SyncOrderInput,
  type SyncOrderResult,
} from '@/lib/offline-sync'
import type { Prisma } from '@prisma/client'

type CreateOrderResult = {
  success: boolean
  order?: { id: string }
  replayed?: boolean
  error?: string
  status?: string
  reason?: string
  details?: StockConflictDetail[]
}

type CreateOrderFn = (order: ReturnType<typeof toCreateOrderInput>) => Promise<CreateOrderResult>

function buildResultId(order: SyncOrderInput, index: number) {
  return order.clientRequestId ?? order.id?.toString() ?? `sync-${index}`
}

function normalizeExternalPayload(value: SyncOrderInput['externalPayload']): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined
  return value as Prisma.InputJsonValue
}

export function toCreateOrderInput(order: SyncOrderInput) {
  return {
    clientRequestId: order.clientRequestId,
    storeId: order.storeId,
    cashierId: order.cashierId ?? order.serverId,
    serverId: order.serverId,
    total: order.total,
    type: order.type,
    paymentMode: order.paymentMode,
    paymentStatus: normalizeSyncPaymentStatus(order.paymentStatus),
    tableId: order.tableId,
    promotionId: order.promotionId,
    discount: order.discount,
    customerId: order.customerId,
    loyaltyPointsRedeemed: order.loyaltyPointsRedeemed,
    externalPayload: normalizeExternalPayload(order.externalPayload),
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      options: item.options,
    })),
  }
}

function failureToSyncResult(order: SyncOrderInput, index: number, result: CreateOrderResult): SyncOrderResult {
  const id = buildResultId(order, index)
  if (result.status === 'CONFLICT' || result.reason === 'STOCK_INSUFFICIENT') {
    return {
      id,
      clientRequestId: order.clientRequestId,
      status: 'CONFLICT',
      reason: result.reason === 'STOCK_INSUFFICIENT' ? 'STOCK_INSUFFICIENT' : 'UNKNOWN',
      error: result.error ?? 'Conflit de synchronisation',
      details: result.details,
    }
  }

  return {
    id,
    clientRequestId: order.clientRequestId,
    status: 'FAILED',
    reason: 'VALIDATION_FAILED',
    error: result.error ?? 'Synchronisation impossible',
  }
}

/**
 * Synchronise chaque commande indépendamment afin qu'un échec ne bloque jamais le lot complet.
 */
export async function syncOrdersWithCreateOrder(
  orders: SyncOrderInput[],
  createOrder: CreateOrderFn
): Promise<SyncOrderResult[]> {
  const batch = orders.slice(0, 10)
  const results: SyncOrderResult[] = []

  for (const [index, order] of batch.entries()) {
    try {
      const result = await createOrder(toCreateOrderInput(order))

      if (result.success && result.order) {
        results.push({
          id: buildResultId(order, index),
          clientRequestId: order.clientRequestId,
          orderId: result.order.id,
          status: result.replayed ? 'REPLAYED' : 'SYNCED',
        })
      } else {
        results.push(failureToSyncResult(order, index, result))
      }
    } catch (error) {
      results.push({
        id: buildResultId(order, index),
        clientRequestId: order.clientRequestId,
        status: 'FAILED',
        reason: 'UNKNOWN',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  return results
}
