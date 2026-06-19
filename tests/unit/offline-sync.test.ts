import { describe, expect, it } from 'vitest'
import { syncBatchSchema } from '@/lib/offline-sync'
import { toCreateOrderInput } from '@/services/order/order-sync.service'

describe('offline sync contract', () => {
  it('conserve tous les champs métier d’une commande mise en file', () => {
    const [order] = syncBatchSchema.parse([{
      clientRequestId: '123e4567-e89b-42d3-a456-426614174000',
      storeId: 'store-1',
      cashierId: 'cashier-1',
      serverId: 'server-1',
      total: 12500,
      type: 'DINE_IN',
      paymentMode: 'ESPECES',
      paymentStatus: 'PENDING',
      tableId: 'table-7',
      discount: 500,
      promotionId: 'promo-1',
      customerId: 'customer-1',
      loyaltyPointsRedeemed: 10,
      externalPayload: { deliveryAddress: 'Abidjan', selectedBills: [10000, 5000] },
      items: [{ productId: 'prod-1', quantity: 2, price: 6000, name: 'Plat', options: 'sans piment' }],
      queuedAt: '2026-06-19T10:00:00.000Z',
    }])

    const createInput = toCreateOrderInput(order)

    expect(order.schemaVersion).toBe(2)
    expect(order.localStatus).toBe('PENDING_SYNC')
    expect(createInput.tableId).toBe('table-7')
    expect(createInput.paymentStatus).toBe('EN_ATTENTE')
    expect(createInput.discount).toBe(500)
    expect(createInput.promotionId).toBe('promo-1')
    expect(createInput.customerId).toBe('customer-1')
    expect(createInput.loyaltyPointsRedeemed).toBe(10)
    expect(createInput.externalPayload).toEqual({ deliveryAddress: 'Abidjan', selectedBills: [10000, 5000] })
  })
})
