'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Trash2, Coins, Lock } from 'lucide-react'
import { useSession } from 'next-auth/react'
import type { Reservation, Table } from '@prisma/client'
import { markOrderServed } from '@/app/actions/orders/orders'
import { openShift, closeShift } from '@/app/actions/caisse/cashDrawer'

import type { CachedCategory, CachedProduct } from '@/lib/idb'
import { useCart } from '@/store/useCart'

import { usePOSCheckout } from './hooks/usePOSCheckout'
import { usePOSRealtime } from './hooks/usePOSRealtime'
import { usePOSSyncState } from './hooks/usePOSSyncState'
import {
  computeEstimatedPrepMinutes,
  createInitialDisplayOrderId,
  formatEstimatedReadyTime,
  nextDisplayOrderId,
  type OrderFlowMode,
  type POSViewMode,
} from './lib/pos-helpers'
import { POSHeader } from './subcomponents/POSHeader'
import { POSOrderSidebar } from './subcomponents/POSOrderSidebar'
import { POSWorkspace } from './subcomponents/POSWorkspace'
import { Sidebar } from './subcomponents/Sidebar'
import { POSModals } from './subcomponents/POSModals'
import { BarcodeScannerModal } from './subcomponents/BarcodeScannerModal'

// ── Types Shift ─────────────────────────────────────────────────────────────
type ActiveShift = {
  id: string
  startAmount: number
  openedByName: string
  openedAt: Date | string
}

type LiveOrder = {
  id: string
  tableId?: string | null
  status: string
  total?: number
  servedAt?: Date | string | null
  table?: {
    number: number
  } | null
  items: {
    id: string
    quantity: number
    options?: string | null
    product: {
      name: string
    }
  }[]
}

type POSAlertState = {
  title: string
  message: string
  type?: 'error' | 'success' | 'info'
} | null

interface POSClientProps {
  categories: CachedCategory[]
  products: CachedProduct[]
  tables: Table[]
  reservations: Reservation[]
  activeOrders?: LiveOrder[]
  storeId: string
  cashierId: string
  operatorRole?: 'CASHIER' | 'SERVER'
  flowModeLocked?: boolean
  initialFlowMode?: OrderFlowMode
  initialViewMode?: POSViewMode
  initialActiveShift?: ActiveShift | null
}

export default function POSClient({
  categories: initialCategories,
  products: initialProducts,
  tables,
  reservations,
  activeOrders = [],
  storeId,
  cashierId,
  operatorRole = 'CASHIER',
  flowModeLocked = false,
  initialFlowMode = 'DIRECT',
  initialViewMode = 'POS',
  initialActiveShift = null,
}: POSClientProps) {
  const { data: session } = useSession()
  const isRestaurateur = session?.user?.role === 'RESTAURATEUR'

  // ── Shift (Rotation de caisse) ──────────────────────────────────────────
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(initialActiveShift)
  const [shiftStartInput, setShiftStartInput] = useState('')
  const [shiftLoading, setShiftLoading] = useState(false)
  const [shiftError, setShiftError] = useState<string | null>(null)

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(shiftStartInput)
    if (isNaN(amount) || amount < 0) {
      setShiftError('Veuillez entrer un montant valide.')
      return
    }
    setShiftLoading(true)
    setShiftError(null)
    const res = await openShift(storeId, cashierId, session?.user?.name || 'Caissier', amount)
    setShiftLoading(false)
    if (res.success && res.shift) {
      setActiveShift(res.shift as unknown as ActiveShift)
      setShiftStartInput('')
    } else {
      setShiftError(res.error || "Erreur lors de l'ouverture.")
    }
  }

  const handleCloseShift = async (endAmount: number) => {
    if (!activeShift) return
    const res = await closeShift(activeShift.id, cashierId, session?.user?.name || 'Caissier', endAmount)
    if (res.success) {
      setActiveShift(null)
    }
    return res
  }

  const [categories, setCategories] = useState(initialCategories)
  const [products, setProducts] = useState(initialProducts)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [orderFlowMode, setOrderFlowMode] = useState<OrderFlowMode>(initialFlowMode)
  const [viewMode, setViewMode] = useState<POSViewMode>(initialViewMode)

  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [tableForReservation, setTableForReservation] = useState<Table | null>(null)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showTableStatusModal, setShowTableStatusModal] = useState<Table | null>(null)
  const [editingOptionsId, setEditingOptionsId] = useState<string | null>(null)
  const [showSessionStats, setShowSessionStats] = useState(false)
  const [orderId, setOrderId] = useState(() => createInitialDisplayOrderId(cashierId))
  const [alertState, setAlertState] = useState<POSAlertState>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showCameraScanner, setShowCameraScanner] = useState(false)

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        options: '',
        image: product.image,
      })
      setAlertState({
        title: 'Produit Scanné',
        message: `${product.name} ajouté au panier.`,
        type: 'success',
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
        type: 'error',
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

  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateOptions,
    getSubtotal,
    getTax,
    getTotal,
    clearCart,
  } = useCart()

  const {
    isOnline,
    isSyncing,
    syncQueueCount,
    sessionTotal,
    refreshSyncQueueCount,
    syncPendingOrders,
    updateSessionStats,
  } = usePOSSyncState({
    cashierId,
    initialCategories,
    initialProducts,
    onHydrateCategories: setCategories,
    onHydrateProducts: setProducts,
  })

  const { stockAlerts, setStockAlerts, liveActiveOrders, mergeLiveOrder } = usePOSRealtime({
    initialOrders: activeOrders,
    storeId,
    onReadyOrder: (message) => {
      setAlertState({
        title: 'Commande prete',
        message,
        type: 'success',
      })
    },
    onServerCall: (message) => {
      setAlertState({
        title: 'Appel serveur',
        message,
        type: 'info',
      })
    },
  })

  useEffect(() => {
    if (flowModeLocked) return
    const savedFlowMode = window.localStorage.getItem(`pos_order_flow_${cashierId}`)
    if (savedFlowMode !== 'DIRECT' && savedFlowMode !== 'TABLE_SERVICE') return

    const frameId = window.requestAnimationFrame(() => {
      setOrderFlowMode(savedFlowMode)
      if (savedFlowMode === 'TABLE_SERVICE') {
        setViewMode('FLOOR_PLAN')
      }
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [cashierId, flowModeLocked])

  useEffect(() => {
    if (flowModeLocked) return
    window.localStorage.setItem(`pos_order_flow_${cashierId}`, orderFlowMode)
  }, [cashierId, orderFlowMode, flowModeLocked])

  // Le client principal reste volontairement simple:
  // il orchestre les etats et delegue le rendu/les effets aux modules dedies.
  const checkout = usePOSCheckout({
    cashierId,
    storeId,
    orderId,
    orderFlowMode,
    selectedTable,
    liveActiveOrders,
    items,
    isOnline,
    getTotal,
    clearCart,
    refreshSyncQueueCount,
    updateSessionStats,
    advanceOrderId: () => setOrderId((currentOrderId) => nextDisplayOrderId(currentOrderId)),
    mergeLiveOrder,
    operatorRole,
    onAfterCheckout: () => {
      setSelectedTable(null)
      setViewMode(orderFlowMode === 'TABLE_SERVICE' ? 'FLOOR_PLAN' : 'POS')
      setShowCart(false)
    },
    onRequireTable: () => setViewMode('FLOOR_PLAN'),
    onAlert: (alert) => setAlertState(alert),
  })

  // ── Écran de blocage si le caissier n'a pas ouvert sa caisse ────────────
  if (operatorRole === 'CASHIER' && !activeShift) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1a1d24] z-[200]">
        <div className="w-full max-w-sm rounded-[2.5rem] bg-white p-10 shadow-2xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 ring-4 ring-orange-100">
            <Lock className="h-9 w-9 text-[#FF6D00]" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#212529] mb-1">Caisse Fermée</h2>
          <p className="text-xs font-medium text-[#adb5bd] mb-8">Saisissez le fond de caisse initial pour démarrer votre service</p>

          <form onSubmit={handleOpenShift} className="flex flex-col gap-4">
            <div className="relative">
              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#adb5bd]" />
              <input
                type="number"
                min="0"
                step="500"
                value={shiftStartInput}
                onChange={(e) => setShiftStartInput(e.target.value)}
                placeholder="Fond initial (FCFA)"
                className="w-full rounded-2xl border border-[#e9ecef] bg-[#f8f9fa] py-4 pl-12 pr-4 text-sm font-semibold text-[#212529] outline-none focus:border-[#FF6D00] focus:ring-2 focus:ring-[#FF6D00]/20"
                required
              />
            </div>
            {shiftError && <p className="text-xs font-bold text-red-500">{shiftError}</p>}
            <button
              type="submit"
              disabled={shiftLoading}
              className="w-full rounded-2xl bg-[#FF6D00] py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 disabled:opacity-60"
            >
              {shiftLoading ? 'Ouverture...' : 'Ouvrir la Caisse'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const cartEstimatedPrepMinutes = computeEstimatedPrepMinutes(items, products)
  const cartEstimatedReadyLabel = formatEstimatedReadyTime(cartEstimatedPrepMinutes)
  const activeTableOrder = showTableStatusModal
    ? liveActiveOrders.find(
        (order) =>
          order.tableId === showTableStatusModal.id &&
          order.status !== 'COMPLETED' &&
          order.status !== 'CANCELLED'
      ) || null
    : null

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !activeCategory || product.categoryId === activeCategory
    const isAvailable = product.isAvailable !== false
    return matchesSearch && matchesCategory && isAvailable
  })

  const handleMarkOrderServed = async () => {
    if (!activeTableOrder) return

    const result = await markOrderServed(activeTableOrder.id, storeId)
    if (result.success && result.order) {
      mergeLiveOrder(result.order)
      setAlertState({
        title: 'Commande servie',
        message: result.hasPendingPayment
          ? 'Commande servie. La table reste occupée jusqu’à l’encaissement.'
          : 'Commande servie et clôturée.',
        type: 'success',
      })
      if (!result.hasPendingPayment) setShowTableStatusModal(null)
      return
    }

    setAlertState({
      title: 'Mise a jour impossible',
      message: result.error || "Impossible de marquer cette commande comme servie.",
      type: 'error',
    })
  }

  return (
    <div className="flex min-h-screen bg-[#f1f3f5] text-[#1a1d24] overflow-hidden font-sans xl:h-screen">
      <Sidebar
        isRestaurateur={isRestaurateur}
        operatorRole={operatorRole}
        setShowSessionStats={setShowSessionStats}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        activeTab={viewMode === 'POS' ? 'CAISSE' : viewMode === 'FLOOR_PLAN' ? 'PLAN' : 'RESERVATIONS'}
        onTabChange={(tab) => {
          setShowSidebar(false)
          if (tab === 'CAISSE') setViewMode('POS')
          else if (tab === 'PLAN') setViewMode('FLOOR_PLAN')
          else if (tab === 'RESERVATIONS') setViewMode('RESERVATIONS')
        }}
        flowModeLocked={flowModeLocked}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden xl:h-full">
        {stockAlerts.length > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-3 bg-[#e03131] px-4 py-2 text-white animate-in slide-in-from-top duration-500 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-white">
              <AlertCircle className="w-4 h-4 animate-pulse" />
              <p className="line-clamp-2 text-[10px] font-black uppercase tracking-widest">
                Alerte Stock Bas : {stockAlerts.map((alert) => `${alert.name} (${alert.stockQuantity})`).join(', ')}
              </p>
            </div>
            <button onClick={() => setStockAlerts([])} className="text-white/60 hover:text-white transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <POSHeader
          viewMode={viewMode}
          operatorRole={operatorRole}
          orderFlowMode={orderFlowMode}
          flowModeLocked={flowModeLocked}
          selectedTable={selectedTable}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isOnline={isOnline}
          isSyncing={isSyncing}
          syncQueueCount={syncQueueCount}
          syncPendingOrders={() => void syncPendingOrders()}
          sessionTotal={sessionTotal}
          cartCount={items.length}
          onOpenSidebar={() => setShowSidebar(true)}
          onOpenCart={() => setShowCart(true)}
          onScanClick={() => setShowCameraScanner(true)}
          onViewPlan={() => {
            setViewMode('FLOOR_PLAN')
            setSelectedTable(null)
          }}
          onFlowModeChange={(mode) => {
            if (flowModeLocked) return
            setOrderFlowMode(mode)
            if (mode === 'TABLE_SERVICE' && !selectedTable) {
              setViewMode('FLOOR_PLAN')
              return
            }
            if (mode === 'DIRECT') {
              setViewMode('POS')
            }
          }}
        />

        <div className="flex-1 overflow-hidden flex flex-col">
          <POSWorkspace
            viewMode={viewMode}
            operatorRole={operatorRole}
            orderFlowMode={orderFlowMode}
            selectedTable={selectedTable}
            tables={tables}
            reservations={reservations}
            activeOrders={liveActiveOrders}
            categories={categories}
            filteredProducts={filteredProducts}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            storeId={storeId}
            onProductAdd={(product) => {
              addItem({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image,
              })
            }}
            onChooseTable={() => setViewMode('FLOOR_PLAN')}
            onTableSelect={(table) => {
              const tableOrder = liveActiveOrders.find(
                (order) =>
                  order.tableId === table.id &&
                  order.status !== 'COMPLETED' &&
                  order.status !== 'CANCELLED'
              )

              if (tableOrder) {
                setShowTableStatusModal(table)
                return
              }

              const reserved = reservations.some(
                (reservation) =>
                  reservation.tableId === table.id &&
                  reservation.status !== 'CANCELLED' &&
                  reservation.status !== 'COMPLETED'
              )

              if (reserved) {
                setAlertState({
                  title: 'Table réservée',
                  message: 'Cette table est réservée. Libérez ou modifiez la réservation avant de démarrer un service.',
                  type: 'info',
                })
                return
              }

              setOrderFlowMode(flowModeLocked ? initialFlowMode : 'TABLE_SERVICE')
              setSelectedTable(table)
              setViewMode('POS')
            }}
            onTableBook={(table) => {
              setTableForReservation(table)
              setShowReservationModal(true)
            }}
          />
        </div>
      </main>

      <POSOrderSidebar
        orderId={orderId}
        orderFlowMode={orderFlowMode}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        selectedTableNumber={selectedTable?.number}
        estimatedPrepMinutes={cartEstimatedPrepMinutes}
        estimatedReadyLabel={cartEstimatedReadyLabel}
        primaryActionLabel={operatorRole === 'SERVER' ? 'Valider la commande' : 'Finaliser la Commande'}
        items={items}
        isProcessing={checkout.isProcessing}
        subtotal={getSubtotal()}
        tax={getTax()}
        total={getTotal()}
        onClearCart={clearCart}
        onCheckout={checkout.handleCheckoutClick}
        onEditOptions={setEditingOptionsId}
        onAddItem={(item) =>
          addItem({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: 1,
            options: item.options,
            image: item.image,
          })
        }
        onSubItem={(item) => {
          if (item.quantity > 1) {
            updateQuantity(item.id, item.quantity - 1)
            return
          }

          removeItem(item.id)
        }}
      />

      <POSModals
        showSessionStats={showSessionStats}
        setShowSessionStats={setShowSessionStats}
        sessionTotal={sessionTotal}
        checkout={checkout}
        showReservationModal={showReservationModal}
        setShowReservationModal={setShowReservationModal}
        tableForReservation={tableForReservation}
        storeId={storeId}
        reservations={reservations}
        editingOptionsId={editingOptionsId}
        setEditingOptionsId={setEditingOptionsId}
        items={items}
        updateOptions={updateOptions}
        showTableStatusModal={showTableStatusModal}
        setShowTableStatusModal={setShowTableStatusModal}
        activeTableOrder={activeTableOrder}
        operatorRole={operatorRole}
        handleMarkOrderServed={() => void handleMarkOrderServed()}
        alertState={alertState}
        setAlertState={setAlertState}
        activeShift={activeShift}
        onCloseShift={handleCloseShift}
        onAddItems={(table) => {
          setOrderFlowMode('TABLE_SERVICE')
          setSelectedTable(table)
          setViewMode('POS')
          setShowTableStatusModal(null)
        }}
        onSettlePayment={(table, order) => {
          if (!order) return
          setSelectedTable(table)
          setShowTableStatusModal(null)
          checkout.openSettlementForOrder(order)
        }}
      />

      {showCameraScanner && (
        <BarcodeScannerModal
          onScan={handleBarcodeScanned}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </div>
  )
}
