'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import type { Reservation, Table } from '@prisma/client'
import { updateOrderStatus } from '@/app/actions/orders'

import type { CachedCategory, CachedProduct } from '@/lib/idb'
import { useCart } from '@/store/useCart'

import ReservationModal from './ReservationModal'
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
import { AlertModal } from './subcomponents/AlertModal'
import { CashierStatsModal } from './subcomponents/CashierStatsModal'
import { OptionsModal } from './subcomponents/OptionsModal'
import { PaymentModal } from './subcomponents/PaymentModal'
import { POSHeader } from './subcomponents/POSHeader'
import { POSOrderSidebar } from './subcomponents/POSOrderSidebar'
import { POSWorkspace } from './subcomponents/POSWorkspace'
import { ReceiptModal } from './subcomponents/ReceiptModal'
import { Sidebar } from './subcomponents/Sidebar'
import { TableStatusModal } from './subcomponents/TableStatusModal'

type LiveOrder = {
  id: string
  tableId?: string | null
  status: string
  total?: number
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
}: POSClientProps) {
  const { data: session } = useSession()
  const isRestaurateur = session?.user?.role === 'RESTAURATEUR'

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

    const result = await updateOrderStatus(activeTableOrder.id, 'COMPLETED', storeId)
    if (result.success && result.order) {
      mergeLiveOrder(result.order)
      setShowTableStatusModal(null)
      setAlertState({
        title: 'Commande servie',
        message: activeTableOrder.table?.number
          ? `La table ${activeTableOrder.table.number} a ete marquee comme servie.`
          : 'La commande a ete marquee comme servie.',
        type: 'success',
      })
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
            onProductAdd={(product) => {
              addItem({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
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

      {showSessionStats && (
        <CashierStatsModal
          total={sessionTotal}
          cashierName={session?.user?.name || 'Caissier'}
          onClose={() => setShowSessionStats(false)}
        />
      )}

      {checkout.showReceipt && checkout.lastOrder && (
        <ReceiptModal order={checkout.lastOrder} onClose={() => checkout.setShowReceipt(false)} />
      )}

      {checkout.showPaymentModal && (
        <PaymentModal
          total={checkout.paymentTotal}
          title={checkout.paymentModalTitle}
          showCustomerSection={!checkout.isSettlementFlow}
          showPromoSection={!checkout.isSettlementFlow}
          amountReceived={checkout.amountReceived}
          changeAmount={checkout.changeAmount}
          onKey={(key) => checkout.calculateChange(checkout.amountReceived + key)}
          onDelete={() => checkout.calculateChange(checkout.amountReceived.slice(0, -1))}
          onClear={() => checkout.calculateChange('')}
          onClose={checkout.closePaymentModal}
          onFinalize={checkout.handleCheckout}
          isProcessing={checkout.isProcessing}
          promoCode={checkout.promoCode}
          onPromoChange={checkout.setPromoCode}
          onApplyPromo={checkout.handleApplyPromo}
          discount={checkout.discount}
          selectedCustomer={checkout.selectedCustomer}
          onCustomerSearch={checkout.handleCustomerSearch}
          customerResults={checkout.customerResults}
          onSelectCustomer={(customer) => checkout.setSelectedCustomer(customer)}
        />
      )}

      {showReservationModal && tableForReservation && (
        <ReservationModal
          table={tableForReservation}
          storeId={storeId}
          onClose={() => setShowReservationModal(false)}
          existingReservations={reservations.filter((reservation) => reservation.tableId === tableForReservation.id)}
        />
      )}

      {editingOptionsId && (
        <OptionsModal
          item={items.find((item) => item.id === editingOptionsId)!}
          onSave={(options) => {
            updateOptions(editingOptionsId, options)
            setEditingOptionsId(null)
          }}
          onClose={() => setEditingOptionsId(null)}
        />
      )}

      {showTableStatusModal && (
        <TableStatusModal
          table={showTableStatusModal}
          order={activeTableOrder}
          operatorRole={operatorRole}
          onClose={() => setShowTableStatusModal(null)}
          onAddItems={() => {
            setOrderFlowMode('TABLE_SERVICE')
            setSelectedTable(showTableStatusModal)
            setViewMode('POS')
            setShowTableStatusModal(null)
          }}
          onSettlePayment={() => {
            if (!activeTableOrder) return
            setSelectedTable(showTableStatusModal)
            setShowTableStatusModal(null)
            checkout.openSettlementForOrder(activeTableOrder)
          }}
          onMarkServed={() => void handleMarkOrderServed()}
        />
      )}

      {alertState && (
        <AlertModal
          type={alertState.type || 'error'}
          title={alertState.title}
          message={alertState.message}
          onClose={() => setAlertState(null)}
        />
      )}
    </div>
  )
}
