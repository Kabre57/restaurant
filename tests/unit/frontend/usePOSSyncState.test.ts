// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePOSSyncState } from '@/components/pos/hooks/usePOSSyncState'
import { syncOrdersBatch } from '@/app/actions/orders/orders'
import {
  saveCategoriesToIDB,
  saveProductsToIDB,
  getCategoriesFromIDB,
  getProductsFromIDB,
  getSyncQueue,
  clearSyncQueueItem,
  purgeStaleSyncQueue,
} from '@/lib/idb'

// Mocks
vi.mock('@/app/actions/orders/orders', () => ({
  syncOrdersBatch: vi.fn(),
}))

vi.mock('@/lib/idb', () => ({
  clearSyncQueueItem: vi.fn(),
  getCategoriesFromIDB: vi.fn(),
  getProductsFromIDB: vi.fn(),
  getSyncQueue: vi.fn(),
  purgeStaleSyncQueue: vi.fn(),
  saveCategoriesToIDB: vi.fn(),
  saveProductsToIDB: vi.fn(),
}))

describe('usePOSSyncState Hook', () => {
  const cashierId = 'cashier-1'
  const initialCategories = [{ id: 'cat-1', name: 'Burgers', imageUrl: null }]
  const initialProducts = [
    {
      id: 'prod-1',
      categoryId: 'cat-1',
      name: 'Double Cheese',
      price: 4500,
      image: null,
    },
  ]

  let hydrateCategoriesMock = vi.fn()
  let hydrateProductsMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    hydrateCategoriesMock = vi.fn()
    hydrateProductsMock = vi.fn()
    window.localStorage.clear()

    // Mock IDB defaults
    vi.mocked(purgeStaleSyncQueue).mockResolvedValue(0)
    vi.mocked(getSyncQueue).mockResolvedValue([])
    vi.mocked(getCategoriesFromIDB).mockResolvedValue([])
    vi.mocked(getProductsFromIDB).mockResolvedValue([])

    // Spy on navigator.onLine (default to online)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('doit sauvegarder les categories et produits initiaux dans IndexedDB au chargement', async () => {
    renderHook(() =>
      usePOSSyncState({
        cashierId,
        initialCategories,
        initialProducts,
        onHydrateCategories: hydrateCategoriesMock,
        onHydrateProducts: hydrateProductsMock,
      })
    )

    // Attendre la fin des timeouts
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(saveCategoriesToIDB).toHaveBeenCalledWith(initialCategories)
    expect(saveProductsToIDB).toHaveBeenCalledWith(initialProducts)
  })

  it('doit hydrater les categories et produits depuis IndexedDB si aucun initial n\'est fourni', async () => {
    vi.mocked(getCategoriesFromIDB).mockResolvedValue(initialCategories)
    vi.mocked(getProductsFromIDB).mockResolvedValue(initialProducts)

    renderHook(() =>
      usePOSSyncState({
        cashierId,
        initialCategories: [],
        initialProducts: [],
        onHydrateCategories: hydrateCategoriesMock,
        onHydrateProducts: hydrateProductsMock,
      })
    )

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(getCategoriesFromIDB).toHaveBeenCalled()
    expect(getProductsFromIDB).toHaveBeenCalled()
    expect(hydrateCategoriesMock).toHaveBeenCalledWith(initialCategories)
    expect(hydrateProductsMock).toHaveBeenCalledWith(initialProducts)
  })

  it('doit gerer les statistiques de session via localStorage', async () => {
    const { result } = renderHook(() =>
      usePOSSyncState({
        cashierId,
        initialCategories: [],
        initialProducts: [],
        onHydrateCategories: hydrateCategoriesMock,
        onHydrateProducts: hydrateProductsMock,
      })
    )

    // Initial total should be 0
    expect(result.current.sessionTotal).toBe(0)

    act(() => {
      result.current.updateSessionStats(1500)
    })

    expect(result.current.sessionTotal).toBe(1500)
    expect(window.localStorage.getItem(`cashier_total_${cashierId}`)).toBe('1500')
  })

  it('doit synchroniser les commandes en file d\'attente vers le serveur si online', async () => {
    const queuedOrders = [
      {
        id: 1,
        clientRequestId: 'req-1',
        storeId: 'store-1',
        cashierId: 'cashier-1',
        total: 5000,
        type: 'DINE_IN' as const,
        paymentMode: 'ESPECES',
        items: [{ productId: 'prod-1', quantity: 1, price: 5000 }],
        createdAt: Date.now(),
      },
    ]

    vi.mocked(getSyncQueue).mockResolvedValue(queuedOrders)
    vi.mocked(syncOrdersBatch).mockResolvedValue([{ success: true } as any])

    const { result } = renderHook(() =>
      usePOSSyncState({
        cashierId,
        initialCategories: [],
        initialProducts: [],
        onHydrateCategories: hydrateCategoriesMock,
        onHydrateProducts: hydrateProductsMock,
      })
    )

    await act(async () => {
      await result.current.syncPendingOrders()
    })

    expect(syncOrdersBatch).toHaveBeenCalled()
    expect(clearSyncQueueItem).toHaveBeenCalledWith(1)
  })

  it('ne doit pas synchroniser si offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    const queuedOrders = [
      {
        id: 1,
        clientRequestId: 'req-1',
        storeId: 'store-1',
        cashierId: 'cashier-1',
        total: 5000,
        type: 'DINE_IN' as const,
        paymentMode: 'ESPECES',
        items: [{ productId: 'prod-1', quantity: 1, price: 5000 }],
        createdAt: Date.now(),
      },
    ]

    vi.mocked(getSyncQueue).mockResolvedValue(queuedOrders)

    const { result } = renderHook(() =>
      usePOSSyncState({
        cashierId,
        initialCategories: [],
        initialProducts: [],
        onHydrateCategories: hydrateCategoriesMock,
        onHydrateProducts: hydrateProductsMock,
      })
    )

    await act(async () => {
      await result.current.syncPendingOrders()
    })

    expect(syncOrdersBatch).not.toHaveBeenCalled()
    expect(clearSyncQueueItem).not.toHaveBeenCalled()
  })
})
