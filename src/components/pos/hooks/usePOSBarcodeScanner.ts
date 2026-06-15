import React, { useEffect } from 'react'
import type { CachedProduct } from '@/lib/idb'

type POSAlertState = {
  title: string
  message: string
  type?: 'error' | 'success' | 'info'
} | null

interface UsePOSBarcodeScannerOptions {
  products: CachedProduct[]
  addItem: (item: {
    productId: string
    name: string
    price: number
    quantity: number
    options: string
    image: string | null
  }) => void
  setAlertState: React.Dispatch<React.SetStateAction<POSAlertState>>
}

export function usePOSBarcodeScanner({
  products,
  addItem,
  setAlertState
}: UsePOSBarcodeScannerOptions) {
  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        options: '',
        image: product.image
      })
      setAlertState({
        title: 'Produit Scanné',
        message: `${product.name} ajouté au panier.`,
        type: 'success'
      })
      setTimeout(() => {
        setAlertState(current => {
          if (current?.title === 'Produit Scanné') return null
          return current
        })
      }, 2000)
    } else {
      setAlertState({
        title: 'Code-barres Inconnu',
        message: `Aucun produit correspondant au code ${barcode}.`,
        type: 'error'
      })
    }
  }

  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const currentTime = Date.now()

      if (currentTime - lastKeyTime > 50) {
        buffer = ''
      }

      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          handleBarcodeScanned(buffer)
          buffer = ''
        }
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [products])

  return {
    handleBarcodeScanned
  }
}
