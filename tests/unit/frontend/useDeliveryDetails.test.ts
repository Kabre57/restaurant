// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDeliveryDetails } from '@/components/pos/hooks/useDeliveryDetails'

describe('useDeliveryDetails Hook', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('utilise le devis renvoyé par le serveur pour remplir les détails de livraison', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        distanceKm: 3.4,
        estimatedTimeMinutes: 19,
        deliveryFee: 1800,
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useDeliveryDetails('store-1'))

    await act(async () => {
      await result.current.handleAddressSelect('Cocody, Abidjan')
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/delivery/estimate?storeId=store-1&address=Cocody%2C%20Abidjan'
    )
    expect(result.current.deliveryDistanceKm).toBe(3.4)
    expect(result.current.deliveryDurationMins).toBe(19)
    expect(result.current.deliveryFee).toBe(1800)
    expect(result.current.deliveryQuoteError).toBeNull()
  })
})
