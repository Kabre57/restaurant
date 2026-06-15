// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ServerTicketsClient from '@/components/serveur/ServerTicketsClient'
import { markOrderServed } from '@/app/actions/orders/orderLifecycle'
import { signOut } from 'next-auth/react'

// Mock next/navigation
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn().mockResolvedValue(true),
}))

// Mock order lifecycle actions
vi.mock('@/app/actions/orders/orderLifecycle', () => ({
  markOrderServed: vi.fn(),
}))

// Mock sound notification
vi.mock('@/lib/sound', () => ({
  playNotificationSound: vi.fn(),
}))

describe('Composant ServerTicketsClient', () => {
  const mockOrders = [
    {
      id: 'order-1',
      status: 'PREPARATION',
      storeId: 'store-1',
      createdAt: new Date(),
      items: [
        {
          id: 'item-1',
          quantity: 2,
          product: { name: 'Burger Classique' },
        },
      ],
      table: { number: 3 },
    },
    {
      id: 'order-2',
      status: 'PRET',
      storeId: 'store-1',
      createdAt: new Date(),
      items: [
        {
          id: 'item-2',
          quantity: 1,
          product: { name: 'Frites' },
        },
      ],
      table: { number: 5 },
    },
  ]

  let originalEventSource: any

  beforeEach(() => {
    vi.clearAllMocks()
    originalEventSource = global.EventSource

    // Mock EventSource globally using a class definition
    class MockEventSource {
      addEventListener = vi.fn()
      close = vi.fn()
    }
    global.EventSource = MockEventSource as any
  })

  afterEach(() => {
    global.EventSource = originalEventSource
  })

  it('doit rendre le layout principal avec ses colonnes de tickets', () => {
    render(
      <ServerTicketsClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Restaurant Parabellum"
        operatorName="Jean Serveur"
      />
    )

    expect(screen.getByText('En Cuisine')).toBeDefined()
    expect(screen.getByText('À Transmettre')).toBeDefined()
    expect(screen.getAllByText('Caisse').length).toBeGreaterThan(0)
    expect(screen.getByText(/Jean Serveur/i)).toBeDefined()
  })

  it('doit permettre de basculer sur la vue Alertes', () => {
    render(
      <ServerTicketsClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Restaurant Parabellum"
        operatorName="Jean Serveur"
      />
    )

    const alertesBtn = screen.getByRole('button', { name: /alertes/i })
    fireEvent.click(alertesBtn)

    expect(screen.getByText('Commandes prêtes à servir')).toBeDefined()
    expect(screen.getByText('COMMANDE #ER-2', { exact: false })).toBeDefined()
  })

  it('doit appeler markOrderServed lors de la transmission d\'une commande prete', async () => {
    vi.mocked(markOrderServed).mockResolvedValue({ success: true } as any)

    render(
      <ServerTicketsClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Restaurant Parabellum"
        operatorName="Jean Serveur"
      />
    )

    const transmitBtn = screen.getByRole('button', { name: /transmettre/i })
    await act(async () => {
      fireEvent.click(transmitBtn)
    })

    expect(markOrderServed).toHaveBeenCalledWith('order-2', 'store-1')
  })

  it('doit appeler signOut et rediriger lors du logout', async () => {
    render(
      <ServerTicketsClient
        initialOrders={mockOrders}
        storeId="store-1"
        storeName="Restaurant Parabellum"
        operatorName="Jean Serveur"
      />
    )

    const logoutBtn = screen.getByRole('button', { name: /sortir/i })
    await act(async () => {
      fireEvent.click(logoutBtn)
    })

    expect(signOut).toHaveBeenCalled()
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
  })
})
