import { describe, expect, it } from 'vitest'
import type { StockConflictDetail, SyncOrderInput } from '@/lib/offline-sync'
import { syncOrdersWithCreateOrder, toCreateOrderInput } from '@/services/order/order-sync.service'

describe('syncOrdersWithCreateOrder', () => {
  const baseOrder: SyncOrderInput = {
    clientRequestId: '123e4567-e89b-42d3-a456-426614174001',
    storeId: 'store-1',
    cashierId: 'cashier-1',
    type: 'TAKEAWAY',
    paymentMode: 'ESPECES',
    paymentStatus: 'PAID',
    items: [{ productId: 'prod-1', quantity: 1, price: 1500 }],
    schemaVersion: 2,
    localStatus: 'PENDING_SYNC',
  }

  it('isole les succès, rejeux et conflits dans un même lot', async () => {
    const details: StockConflictDetail[] = [{
      productId: 'prod-2',
      name: 'Burger',
      requested: 5,
      available: 2,
    }]
    const orders: SyncOrderInput[] = [
      baseOrder,
      { ...baseOrder, clientRequestId: '123e4567-e89b-42d3-a456-426614174002' },
      { ...baseOrder, clientRequestId: '123e4567-e89b-42d3-a456-426614174003', items: [{ productId: 'prod-2', quantity: 5 }] },
    ]

    const results = await syncOrdersWithCreateOrder(orders, async (order: ReturnType<typeof toCreateOrderInput>) => {
      if (order.clientRequestId?.endsWith('4002')) {
        return { success: true, replayed: true, order: { id: 'order-replayed' } }
      }
      if (order.clientRequestId?.endsWith('4003')) {
        return {
          success: false,
          status: 'CONFLICT',
          reason: 'STOCK_INSUFFICIENT',
          error: 'Stock insuffisant',
          details,
        }
      }
      return { success: true, order: { id: 'order-synced' } }
    })

    expect(results).toEqual([
      expect.objectContaining({ status: 'SYNCED', orderId: 'order-synced' }),
      expect.objectContaining({ status: 'REPLAYED', orderId: 'order-replayed' }),
      expect.objectContaining({ status: 'CONFLICT', reason: 'STOCK_INSUFFICIENT', details }),
    ])
  })
})
