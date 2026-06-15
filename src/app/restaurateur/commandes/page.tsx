'use client'

import { useEffect, useState } from 'react'
import { Filter, Loader2, Search } from 'lucide-react'
import { useSession } from 'next-auth/react'

import { cancelOrder, modifyOrder, refundOrder } from '@/app/actions/orders/orderManagement'
import { getStoreOrders } from '@/app/actions/orders/orders'
import { getProductsByStore } from '@/app/actions/catalog/products'

import { OrdersList } from './components/OrdersList'
import { OrderDetailsModal } from './components/OrderDetailsModal'
import { OrderModificationModal } from './components/OrderModificationModal'
import { hasSucceededPayment } from './helpers'
import type { CatalogProduct, OrderModificationItem, OrderSummary } from './types'

export default function RestaurateurCommandes() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<CatalogProduct[]>([])
  const [modifyingOrder, setModifyingOrder] = useState<OrderSummary | null>(null)
  const [modifiedItems, setModifiedItems] = useState<OrderModificationItem[]>([])
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return
    const activeStoreId = storeId

    let isCancelled = false

    async function fetchOrders() {
      setLoading(true)
      const data = await getStoreOrders(activeStoreId)
      if (isCancelled) return
      setOrders(data as OrderSummary[])
      setLoading(false)
    }

    void fetchOrders()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  const reloadOrders = async () => {
    const storeId = session?.user?.storeId
    if (!storeId) return
    const data = await getStoreOrders(storeId)
    setOrders(data as OrderSummary[])
  }

  const handleCancelOrder = async (order: OrderSummary) => {
    const paidWarning = hasSucceededPayment(order)
      ? "\n\nAttention : cette action annule la commande sans marquer le paiement comme remboursé. Utilisez « Annuler & rembourser » si l'argent est rendu au client."
      : ''

    if (!confirm(`Êtes-vous sûr de vouloir annuler cette commande ? Les stocks des produits suivis seront automatiquement recrédités.${paidWarning}`)) return

    setActionLoading(true)
    try {
      const res = await cancelOrder(order.id)
      if (res.success) {
        setSelectedOrder(res.order as OrderSummary)
        await reloadOrders()
      } else {
        alert(res.error || "Erreur lors de l'annulation")
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefundOrder = async (order: OrderSummary) => {
    const stockMessage = order.status === 'COMPLETED'
      ? "\n\nCette commande est déjà terminée : le stock ne sera pas recrédité automatiquement."
      : "\n\nSi la commande n'est pas terminée, les stocks seront recrédités automatiquement."

    if (!confirm(`Confirmer le remboursement complet de cette commande ? Le paiement passera en REMBOURSÉ et la commande sera annulée.${stockMessage}`)) return

    setActionLoading(true)
    try {
      const res = await refundOrder(order.id)
      if (res.success) {
        setSelectedOrder(res.order as OrderSummary)
        await reloadOrders()
      } else {
        alert(res.error || "Erreur lors du remboursement")
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartModification = async (order: OrderSummary) => {
    setModifyingOrder(order)
    setProductSearch('')
    setModifiedItems(
      (order.items || []).map((item) => ({
        productId: item.productId || item.product?.id || '',
        name: item.product?.name || 'Produit',
        price: item.price,
        quantity: item.quantity,
        options: item.options || '',
      })),
    )

    const storeId = session?.user?.storeId
    if (storeId && availableProducts.length === 0) {
      const prods = await getProductsByStore(storeId)
      setAvailableProducts((prods || []) as CatalogProduct[])
    }
  }

  const handleIncrement = (index: number) => {
    setModifiedItems(prev => prev.map((item, idx) => (idx === index ? { ...item, quantity: item.quantity + 1 } : item)))
  }

  const handleDecrement = (index: number) => {
    setModifiedItems(prev => prev
      .map((item, idx) => {
        if (idx !== index) return item
        const nextQuantity = item.quantity - 1
        return nextQuantity > 0 ? { ...item, quantity: nextQuantity } : null
      })
      .filter((item): item is OrderModificationItem => item !== null))
  }

  const handleRemoveItem = (index: number) => {
    setModifiedItems(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleAddProduct = (product: CatalogProduct) => {
    const existingIndex = modifiedItems.findIndex(item => item.productId === product.id)
    if (existingIndex > -1) {
      handleIncrement(existingIndex)
      return
    }

    setModifiedItems(prev => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        options: '',
      },
    ])
  }

  const handleSubmitModification = async () => {
    if (!modifyingOrder) return
    if (!modifiedItems.length) {
      alert('La commande doit contenir au moins un article.')
      return
    }

    setActionLoading(true)
    const res = await modifyOrder(modifyingOrder.id, modifiedItems)
    if (res.success) {
      setModifyingOrder(null)
      setSelectedOrder(res.order as OrderSummary)
      const storeId = session?.user?.storeId
      if (storeId) {
        const data = await getStoreOrders(storeId)
        setOrders(data as OrderSummary[])
      }
    } else {
      alert(res.error || 'Erreur lors de la modification')
    }
    setActionLoading(false)
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredOrders = normalizedSearch.length > 0
    ? orders.filter((order) => (
        order.id.toLowerCase().includes(normalizedSearch) ||
        String(order.table?.number ?? '').includes(normalizedSearch)
      ))
    : orders

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Historique des Commandes</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-[#adb5bd]">Consultez l&apos;historique complet de votre établissement</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-[#dee2e6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
          <input
            type="text"
            placeholder="RECHERCHER PAR ID OU NUMÉRO DE TABLE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#dee2e6] bg-[#f8f9fa] py-3 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
          />
        </div>
        <button className="flex items-center justify-center gap-2 rounded-xl border border-[#dee2e6] bg-[#f8f9fa] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#212529] transition-all hover:bg-[#e9ecef]">
          <Filter className="h-4 w-4" />
          Filtrer
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#adb5bd]" />
        </div>
      ) : (
        <OrdersList orders={filteredOrders} onSelectOrder={setSelectedOrder} />
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          actionLoading={actionLoading}
          onClose={() => setSelectedOrder(null)}
          onCancelOrder={handleCancelOrder}
          onRefundOrder={handleRefundOrder}
          onStartModification={handleStartModification}
        />
      )}

      {modifyingOrder && (
        <OrderModificationModal
          order={modifyingOrder}
          availableProducts={availableProducts}
          modifiedItems={modifiedItems}
          productSearch={productSearch}
          actionLoading={actionLoading}
          onClose={() => setModifyingOrder(null)}
          onSubmit={handleSubmitModification}
          onProductSearchChange={setProductSearch}
          onAddProduct={handleAddProduct}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemoveItem={handleRemoveItem}
        />
      )}
    </div>
  )
}
