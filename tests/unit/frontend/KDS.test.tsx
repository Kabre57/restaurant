// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KDSClient from '@/components/kds/KDSClient'
import { useKDSRealtime } from '@/components/kds/hooks/useKDSRealtime'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn().mockResolvedValue(true),
}))

// Mock Sound
vi.mock('@/lib/sound', () => ({
  playNotificationSound: vi.fn(),
}))

// Mock KDS Realtime hook
vi.mock('@/components/kds/hooks/useKDSRealtime', () => ({
  useKDSRealtime: vi.fn(),
}))

describe('Composant KDSClient', () => {
  const mockOrders = [
    {
      id: 'order-1',
      status: 'EN_ATTENTE',
      storeId: 'store-1',
      type: 'DINE_IN',
      createdAt: new Date(),
      items: [
        {
          id: 'item-1',
          quantity: 2,
          options: null,
          product: {
            name: 'Double Cheese',
            category: { name: 'Burgers' },
          },
        },
      ],
      table: { number: 4 },
      customerNotes: null,
    },
  ]

  const defaultRealtimeState = {
    orders: mockOrders,
    streamStatus: 'connected',
    retryDelay: 0,
    serverCalls: [],
    setServerCalls: vi.fn(),
    kitchenAlerts: [],
    setKitchenAlerts: vi.fn(),
    pendingActions: [],
    completedHistory: [],
    handleUpdateStatus: vi.fn(),
    handleMoveStatusBackward: vi.fn(),
    handleRecallOrder: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useKDSRealtime).mockReturnValue(defaultRealtimeState as any)
  })

  it('doit rendre le composant avec ses 3 colonnes principales de tickets', () => {
    render(
      <KDSClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Boutique Test"
      />
    )

    expect(screen.getByText('Nouvelles Commandes')).toBeDefined()
    expect(screen.getByText('En Préparation')).toBeDefined()
    expect(screen.getByText('Prêt / À Servir')).toBeDefined()
  })

  it('doit filtrer par zone de preparation (Tout, Cuisine, Bar)', () => {
    render(
      <KDSClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Boutique Test"
      />
    )

    // Boutons de zone de préparation
    const toutBtn = screen.getByRole('button', { name: /tout/i })
    const cuisineBtn = screen.getByRole('button', { name: /cuisine/i })
    const barBtn = screen.getByRole('button', { name: /bar/i })

    expect(toutBtn).toBeDefined()
    expect(cuisineBtn).toBeDefined()
    expect(barBtn).toBeDefined()

    // Clic sur Cuisine
    fireEvent.click(cuisineBtn)
    // Clic sur Bar
    fireEvent.click(barBtn)
  })

  it('doit afficher les alertes d\'appels serveur et permettre de les masquer', () => {
    const stateWithCalls = {
      ...defaultRealtimeState,
      serverCalls: [
        { tableId: 't-1', tableNumber: 5, timestamp: '12:00:00' },
      ],
    }
    vi.mocked(useKDSRealtime).mockReturnValue(stateWithCalls as any)

    render(
      <KDSClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Boutique Test"
      />
    )

    expect(screen.getByText(/Appel serveur Table 5/i)).toBeDefined()
    const dismissBtn = screen.getByLabelText(/masquer l'appel/i)
    fireEvent.click(dismissBtn)
    // Devrait appeler le setter ou changer l'état interne
  })

  it('doit permettre de basculer le theme sombre / clair', () => {
    render(
      <KDSClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Boutique Test"
      />
    )

    const toggleThemeBtn = screen.getByTitle(/passer au/i)
    fireEvent.click(toggleThemeBtn)
    expect(localStorage.getItem('kds_theme')).toBe('light')
  })
})
