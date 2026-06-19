import { describe, expect, it } from 'vitest'
import {
  buildStatusConflictAudit,
  createPendingKDSAction,
  shouldApplyServerOrder,
} from '@/components/kds/lib/lww'

describe('KDS LWW conflict rule', () => {
  it('conserve l’action locale quand elle est plus récente que le serveur', () => {
    const actions = [createPendingKDSAction('order-1', 'PRET', '2026-06-19T10:05:00.000Z')]
    const serverOrder = {
      id: 'order-1',
      status: 'PREPARATION' as const,
      updatedAt: '2026-06-19T10:04:00.000Z',
    }

    expect(shouldApplyServerOrder(serverOrder, actions)).toBe(false)
    expect(buildStatusConflictAudit(serverOrder, actions)).toBeNull()
  })

  it('applique le serveur et produit un audit quand il est plus récent', () => {
    const actions = [createPendingKDSAction('order-1', 'PREPARATION', '2026-06-19T10:04:00.000Z')]
    const serverOrder = {
      id: 'order-1',
      status: 'PRET' as const,
      updatedAt: '2026-06-19T10:05:00.000Z',
    }

    expect(shouldApplyServerOrder(serverOrder, actions)).toBe(true)
    expect(buildStatusConflictAudit(serverOrder, actions)).toEqual({
      type: 'STATUS_CONFLICT',
      orderId: 'order-1',
      localStatus: 'PREPARATION',
      serverStatus: 'PRET',
      localUpdatedAt: '2026-06-19T10:04:00.000Z',
      serverUpdatedAt: '2026-06-19T10:05:00.000Z',
    })
  })
})
