// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Cart } from '@/components/pos/subcomponents/Cart'
import type { CartItem as CartItemData } from '@/store/useCart'

describe('Composant Cart', () => {
  const items: CartItemData[] = [
    {
      id: 'item-1',
      productId: 'prod-1',
      name: 'Double Cheese',
      price: 4500,
      quantity: 2,
      options: 'Sans oignons',
    },
  ]

  const defaultProps = {
    orderId: 1024,
    orderFlowMode: 'DIRECT' as const,
    selectedTableNumber: null,
    items: [],
    isProcessing: false,
    subtotal: 0,
    tax: 0,
    total: 0,
    onClearCart: vi.fn(),
    onAddItem: vi.fn(),
    onSubItem: vi.fn(),
    onEditOptions: vi.fn(),
    onCheckout: vi.fn(),
    onClose: vi.fn(),
  }

  it('doit afficher un état vide si le panier ne contient aucun article', () => {
    render(<Cart {...defaultProps} />)
    expect(screen.getByText(/panier vide/i)).toBeDefined()
    const checkoutBtn = screen.getByRole('button', { name: /valider la commande/i })
    expect((checkoutBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('doit afficher les articles et les totaux correctement', () => {
    render(
      <Cart
        {...defaultProps}
        items={items}
        subtotal={9000}
        tax={1620}
        total={10620}
      />
    )

    expect(screen.getByText(/COMMANDE #1024/i)).toBeDefined()
    expect(screen.getByText(/Double Cheese/i)).toBeDefined()
    expect(screen.getByText('9 000 FCFA')).toBeDefined()
    expect(screen.getByText('1 620 FCFA')).toBeDefined()
    expect(screen.getByText('10 620')).toBeDefined()

    const checkoutBtn = screen.getByRole('button', { name: /valider la commande/i })
    expect((checkoutBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('doit appeler onClearCart lors du clic sur le bouton poubelle', () => {
    const onClearCart = vi.fn()
    render(<Cart {...defaultProps} items={items} onClearCart={onClearCart} />)

    const clearBtn = screen.getByLabelText(/vider le panier/i)
    fireEvent.click(clearBtn)
    expect(onClearCart).toHaveBeenCalledTimes(1)
  })

  it('doit appeler onCheckout lors du clic sur le bouton de validation', () => {
    const onCheckout = vi.fn()
    render(<Cart {...defaultProps} items={items} onCheckout={onCheckout} />)

    const checkoutBtn = screen.getByRole('button', { name: /valider la commande/i })
    fireEvent.click(checkoutBtn)
    expect(onCheckout).toHaveBeenCalledTimes(1)
  })

  it('doit appeler onClose lors du clic sur le bouton de fermeture', () => {
    const onClose = vi.fn()
    render(<Cart {...defaultProps} items={items} onClose={onClose} />)

    const closeBtn = screen.getByLabelText(/fermer le panier/i)
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
