'use client'

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { 
  CreditCard, 
  Search, 
  Banknote, 
  Smartphone, 
  ChevronRight, 
  User,
  LayoutGrid,
  Map as MapIcon,
  ChevronLeft,
  Trash2,
  Plus,
  AlertCircle
} from "lucide-react"

import { useCart } from "@/store/useCart"
type CartItemType = {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  options?: string
}
import { createOrder, syncOrdersBatch, addItemsToOrder } from "@/app/actions/orders"
import { validatePromotion, searchCustomer } from '@/app/actions/loyalty'
import { 
  saveCategoriesToIDB, 
  saveProductsToIDB, 
  getCategoriesFromIDB, 
  getProductsFromIDB, 
  addOrderToSyncQueue, 
  getSyncQueue,
  clearSyncQueueItem
} from "@/lib/idb"
import type { CachedCategory, CachedProduct, QueuedOrder } from "@/lib/idb"

// Sub-components
import { Sidebar } from "./subcomponents/Sidebar"
import { ProductCard } from "./subcomponents/ProductCard"
import { CartItem } from "./subcomponents/CartItem"
import { ReceiptModal } from "./subcomponents/ReceiptModal"
import { PaymentModal } from "./subcomponents/PaymentModal"
import { ConnectionStatus } from "./subcomponents/ConnectionStatus"
import { POSHeader } from "./subcomponents/POSHeader"
import { TableStatusModal } from "./subcomponents/TableStatusModal"
import { OptionsModal } from "./subcomponents/OptionsModal"
import { ReservationsList } from "./subcomponents/ReservationsList"
import { CashierStatsModal } from "./subcomponents/CashierStatsModal"
import FloorPlanView from "./FloorPlanView"
import ReservationModal from "./ReservationModal"
import { AlertModal } from "./subcomponents/AlertModal"
import type { ReceiptOrder } from "./subcomponents/ReceiptModal"
import { Table, Reservation } from "@prisma/client"

type PaymentMode = 'ESPECES' | 'CB' | 'MOBILE_MONEY'
type PendingOrder = Omit<QueuedOrder, 'createdAt'>

interface POSClientProps {
  categories: CachedCategory[]
  products: CachedProduct[]
  tables: Table[]
  reservations: Reservation[]
  activeOrders?: any[]
  storeId: string
  cashierId: string
}

function createInitialDisplayOrderId(seed: string) {
  const hash = Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0)
  return 1000 + (hash % 9000)
}

function nextDisplayOrderId(current: number) {
  return current >= 9999 ? 1000 : current + 1
}

function createClientRequestId(storeId: string, cashierId: string) {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${performance.now().toString(36).replace('.', '')}`

  return `${storeId}:${cashierId}:${randomId}`
}

export default function POSClient({ categories: initialCategories, products: initialProducts, tables, reservations, activeOrders = [], storeId, cashierId }: POSClientProps) {
  const { data: session } = useSession()
  const isRestaurateur = session?.user?.role === 'RESTAURATEUR'
  
  const [categories, setCategories] = useState(initialCategories)
  const [products, setProducts] = useState(initialProducts)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncQueueCount, setSyncQueueCount] = useState(0)
  const [showSessionStats, setShowSessionStats] = useState(false)
  const [sessionTotal, setSessionTotal] = useState(0) 
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [lastOrder, setLastOrder] = useState<ReceiptOrder | null>(null)
  const [amountReceived, setAmountReceived] = useState("")
  const [changeAmount, setChangeAmount] = useState<number | null>(null)
  const [orderId, setOrderId] = useState(() => createInitialDisplayOrderId(cashierId))
  const [viewMode, setViewMode] = useState<'POS' | 'FLOOR_PLAN' | 'RESERVATIONS'>('POS')
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [tableForReservation, setTableForReservation] = useState<Table | null>(null)
  const [editingOptionsId, setEditingOptionsId] = useState<string | null>(null)
  const [showTableStatusModal, setShowTableStatusModal] = useState<Table | null>(null)
  const [stockAlerts, setStockAlerts] = useState<{name: string, stockQuantity: number}[]>([])
  const [promoCode, setPromoCode] = useState("")
  const [discount, setDiscount] = useState(0)
  const [appliedPromoId, setAppliedPromoId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [alertState, setAlertState] = useState<{ title: string, message: string, type?: 'error' | 'success' } | null>(null)
  const syncInFlightRef = useRef(false)

  const { items, addItem, removeItem, updateQuantity, updateOptions, getSubtotal, getTax, getTotal, clearCart } = useCart()

  const handleProductAdd = (product: any) => {
    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 })
  }

  const advanceOrderId = useCallback(() => {
    setOrderId((current) => nextDisplayOrderId(current))
  }, [])

  const refreshSyncQueueCount = useCallback(async () => {
    const queue = await getSyncQueue()
    setSyncQueueCount(queue.length)
    return queue
  }, [])

  const syncPendingOrders = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (syncInFlightRef.current) return

    syncInFlightRef.current = true
    setIsSyncing(true)

    try {
      const queue = await refreshSyncQueueCount()

      for (let index = 0; index < queue.length; index += 5) {
        const batch = queue.slice(index, index + 5).map((pendingOrder) => ({
          ...pendingOrder,
          clientRequestId: pendingOrder.clientRequestId || createClientRequestId(pendingOrder.storeId, pendingOrder.cashierId),
          paymentMode: pendingOrder.paymentMode || 'ESPECES',
        }))

        const results = await syncOrdersBatch(batch.map((pendingOrder) => ({
          clientRequestId: pendingOrder.clientRequestId,
          storeId: pendingOrder.storeId,
          cashierId: pendingOrder.cashierId,
          total: pendingOrder.total,
          type: pendingOrder.type,
          paymentMode: pendingOrder.paymentMode,
          items: pendingOrder.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            options: item.options,
          })),
        })))

        for (const [resultIndex, result] of results.entries()) {
          const pendingOrder = batch[resultIndex]

          if (!result.success) {
            console.error("Queued order was not synced:", result.error)
            continue
          }

          if (typeof pendingOrder.id === 'number') {
            await clearSyncQueueItem(pendingOrder.id)
          }
        }

        await refreshSyncQueueCount()
      }
    } catch (error) {
      console.error("Offline sync failed:", error)
    } finally {
      syncInFlightRef.current = false
      setIsSyncing(false)
    }
  }, [refreshSyncQueueCount])

  const loadOfflineData = useCallback(async () => {
    if (initialCategories.length > 0) {
      await saveCategoriesToIDB(initialCategories)
      await saveProductsToIDB(initialProducts)
    } else {
      const cats = await getCategoriesFromIDB()
      const prods = await getProductsFromIDB()
      if (cats.length > 0) setCategories(cats)
      if (prods.length > 0) setProducts(prods)
    }

    await refreshSyncQueueCount()
  }, [initialCategories, initialProducts, refreshSyncQueueCount])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const saved = localStorage.getItem(`cashier_total_${cashierId}`)
      if (saved) setSessionTotal(parseFloat(saved))
    })

    const handleStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      if (online) void syncPendingOrders()
    }

    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)

    const statusTimerId = window.setTimeout(handleStatus, 0)
    const loadTimerId = window.setTimeout(() => {
      void loadOfflineData().then(() => {
        if (navigator.onLine) void syncPendingOrders()
      })
    }, 0)

    // Stock Alerts Listener
    let alertSource: EventSource | null = null
    if (navigator.onLine) {
      alertSource = new EventSource(`/api/stock/alerts?storeId=${storeId}`)
      alertSource.onmessage = (e) => {
        const data = JSON.parse(e.data)
        setStockAlerts(prev => {
          // Prevent duplicates
          if (prev.some(a => a.name === data.name)) return prev
          return [data, ...prev].slice(0, 5)
        })
      }
    }

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(statusTimerId)
      window.clearTimeout(loadTimerId)
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
      if (alertSource) alertSource.close()
    }
  }, [cashierId, loadOfflineData, syncPendingOrders, storeId])

  const calculateChange = (val: string) => {
    setAmountReceived(val)
    if (val === "") {
      setChangeAmount(null)
      return
    }
    const received = parseFloat(val)
    const netTotal = Math.max(0, getTotal() - discount)
    setChangeAmount(received - netTotal)
  }

  const handleApplyPromo = async () => {
    if (!promoCode) return
    const res = await validatePromotion(promoCode, storeId, getTotal())
    if (res.success) {
      setDiscount(res.discount || 0)
      setAppliedPromoId(res.promoId || null)
    } else {
      setAlertState({ title: "Promotion Invalide", message: res.error || "Ce code promo n'est pas valide." })
      setDiscount(0)
      setAppliedPromoId(null)
    }
  }

  const handleCustomerSearch = async (q: string) => {
    setCustomerSearch(q)
    if (q.length < 3) {
      setCustomerResults([])
      return
    }
    const results = await searchCustomer(q)
    setCustomerResults(results)
  }

  const handleCheckoutClick = () => {
    setShowPaymentModal(true)
  }

  const handleCheckout = async (mode: string) => {
    const currentTotal = getTotal()
    
    setIsProcessing(true)
    // Vérifier si nous ajoutons à une commande existante
    const existingOrder = selectedTable ? activeOrders.find(o => o.tableId === selectedTable.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED') : null;

    if (existingOrder) {
      // Utiliser l'action serveur addItemsToOrder
      const res = await addItemsToOrder(existingOrder.id, items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        options: item.options
      })), currentTotal)

      if (res.success) {
        clearCart()
        setLastOrder({
          id: res.order!.id,
          displayId: orderId,
          items: [...items],
          total: currentTotal,
          date: new Date(),
          paymentMode: mode as PaymentMode,
          amountReceived: mode === 'ESPECES' ? parseInt(amountReceived) : currentTotal,
          changeAmount: mode === 'ESPECES' ? (changeAmount ?? 0) : 0
        })
        updateSessionStats(currentTotal)
        setShowReceipt(true)
        advanceOrderId()
        setShowPaymentModal(false)
        setAmountReceived("")
        setChangeAmount(null)
        setSelectedTable(null)
        setViewMode('FLOOR_PLAN')
      } else {
        setAlertState({ title: "Erreur", message: res.error || "Impossible d'ajouter ces articles à la commande de la table." })
      }
      setIsProcessing(false)
      return
    }

    const orderData: any = {
      clientRequestId: createClientRequestId(storeId, cashierId),
      storeId,
      cashierId,
      total: Math.max(0, currentTotal - discount),
      discount,
      promotionId: appliedPromoId,
      customerId: selectedCustomer?.id,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      })),
      type: 'DINE_IN',
      paymentMode: mode as PaymentMode,
      tableId: selectedTable?.id
    }

    try {
      if (isOnline) {
        const res = await createOrder(orderData)
        if (res.success && res.order) {
          setLastOrder({ ...orderData, id: res.order.id })
          updateSessionStats(currentTotal)
          setShowReceipt(true)
          setShowPaymentModal(false)
          clearCart()
          setAmountReceived("")
          setChangeAmount(null)
          advanceOrderId()
          setSelectedTable(null)
          setViewMode('FLOOR_PLAN')
        } else {
          setAlertState({ title: "Paiement Échoué", message: res.error || "La transaction n'a pas pu être finalisée." })
        }
      } else {
        await addOrderToSyncQueue(orderData)
        await refreshSyncQueueCount()
        updateSessionStats(currentTotal)
        setLastOrder({ ...orderData, id: orderData.clientRequestId, isOffline: true })
        setShowReceipt(true)
        setShowPaymentModal(false)
        clearCart()
        setAmountReceived("")
        setChangeAmount(null)
        advanceOrderId()
      }
    } catch (error) {
      console.error("Checkout failed, order queued for sync:", error)
      await addOrderToSyncQueue(orderData)
      await refreshSyncQueueCount()
      updateSessionStats(currentTotal)
      setLastOrder({ ...orderData, id: orderData.clientRequestId, isOffline: true })
      setShowReceipt(true)
      setShowPaymentModal(false)
      clearCart()
      setAmountReceived("")
      setChangeAmount(null)
      advanceOrderId()
    } finally {
      setIsProcessing(false)
    }
  }

  const updateSessionStats = (amount: number) => {
    setSessionTotal((currentTotal) => {
      const newTotal = currentTotal + amount
      localStorage.setItem(`cashier_total_${cashierId}`, newTotal.toString())
      return newTotal
    })
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !activeCategory || p.categoryId === activeCategory
    const isAvailable = p.isAvailable !== false
    return matchesSearch && matchesCategory && isAvailable
  })

  return (
    <div className="flex h-screen bg-[#f1f3f5] text-[#1a1d24] overflow-hidden font-sans">
      <Sidebar 
        isRestaurateur={isRestaurateur} 
        setShowSessionStats={setShowSessionStats} 
        activeTab={viewMode === 'POS' ? 'CAISSE' : viewMode === 'FLOOR_PLAN' ? 'PLAN' : 'RESERVATIONS'}
        onTabChange={(tab) => {
          if (tab === 'CAISSE') setViewMode('POS')
          else if (tab === 'PLAN') setViewMode('FLOOR_PLAN')
          else if (tab === 'RESERVATIONS') setViewMode('RESERVATIONS')
        }}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {stockAlerts.length > 0 && (
          <div className="bg-[#e03131] px-8 py-2 flex items-center justify-between animate-in slide-in-from-top duration-500 shrink-0">
            <div className="flex items-center gap-4 text-white">
              <AlertCircle className="w-4 h-4 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Alerte Stock Bas : {stockAlerts.map(a => `${a.name} (${a.stockQuantity})`).join(', ')}
              </p>
            </div>
            <button onClick={() => setStockAlerts([])} className="text-white/60 hover:text-white transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        <POSHeader 
          viewMode={viewMode}
          selectedTable={selectedTable}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isOnline={isOnline}
          isSyncing={isSyncing}
          syncQueueCount={syncQueueCount}
          syncPendingOrders={() => void syncPendingOrders()}
          sessionTotal={sessionTotal}
          onViewPlan={() => {
            setViewMode('FLOOR_PLAN')
            setSelectedTable(null)
          }}
        />

        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === 'FLOOR_PLAN' ? (
            <FloorPlanView 
              tables={tables} 
              reservations={reservations}
              activeOrders={activeOrders}
              onTableSelect={(table) => {
                const order = activeOrders.find(o => o.tableId === table.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED')
                if (order) {
                  setShowTableStatusModal(table)
                } else {
                  setSelectedTable(table)
                  setViewMode('POS')
                }
              }}
              onTableBook={(table) => {
                setTableForReservation(table)
                setShowReservationModal(true)
              }}
              selectedTableId={selectedTable?.id}
            />
          ) : viewMode === 'RESERVATIONS' ? (
            <ReservationsList reservations={reservations} />
          ) : (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="flex gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
                <button 
                  onClick={() => setActiveCategory(null)}
                  className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${!activeCategory ? 'bg-[#212529] text-white shadow-xl scale-105' : 'bg-white text-[#adb5bd] hover:bg-[#f8f9fa] border border-[#e9ecef]'}`}
                >
                  Tous les produits
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${activeCategory === cat.id ? 'bg-[#212529] text-white shadow-xl scale-105' : 'bg-white text-[#adb5bd] hover:bg-[#f8f9fa] border border-[#e9ecef]'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    categoryName={categories.find(c => c.id === product.categoryId)?.name || "Général"}
                    onAdd={() => handleProductAdd(product)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <aside className="w-[450px] bg-white border-l border-[#e9ecef] flex flex-col z-30 shadow-2xl overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-end border-b border-[#f1f3f5]">
          <div>
            <span className="text-[10px] font-black text-[#adb5bd] tracking-widest uppercase">Panier Actuel</span>
            <h2 className="text-3xl font-black text-[#212529] tracking-tight">COMMANDE #{orderId || '....'}</h2>
          </div>
          {items.length > 0 && (
            <button onClick={clearCart} className="p-3 text-[#adb5bd] hover:text-[#e03131] hover:bg-[#fff5f5] rounded-xl transition-all">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. ORDER LIST - MIDDLE */}
        <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar bg-white">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
              <div className="w-20 h-20 bg-[#f1f3f5] rounded-full flex items-center justify-center">
                <LayoutGrid className="w-10 h-10" />
              </div>
              <p className="font-black text-xs uppercase tracking-widest">Panier Vide</p>
            </div>
          ) : (
            items.map(item => (
              <CartItem 
                key={item.id} 
                item={item} 
                onAdd={() => addItem({ productId: item.productId, name: item.name, price: item.price, quantity: 1, options: item.options })}
                onSub={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                onOptionsClick={() => setEditingOptionsId(item.id)}
              />
            ))
          )}
        </div>

        {/* 3. TOTALS & FINALIZE - BOTTOM */}
        <div className="bg-[#f8f9fa] border-t border-[#e9ecef] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[#868e96] text-[10px] font-black uppercase tracking-widest">
                <span>Sous-total</span>
                <span>{getSubtotal().toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-[#868e96] text-[10px] font-black uppercase tracking-widest">
                <span>TVA (18%)</span>
                <span>{getTax().toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between items-center text-[#212529] pt-2">
                <span className="text-xs font-black uppercase tracking-widest">Total</span>
                <span className="text-3xl font-black tracking-tight">{getTotal().toLocaleString()} <span className="text-sm">FCFA</span></span>
              </div>
            </div>

            <button
              onClick={handleCheckoutClick}
              disabled={items.length === 0 || isProcessing}
              className="w-full bg-[#212529] hover:bg-black disabled:bg-[#adb5bd] text-white py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
            >
              {isProcessing ? "Traitement..." : "Finaliser la Commande"}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {showSessionStats && (
        <CashierStatsModal 
          total={sessionTotal} 
          cashierName={session?.user?.name || "Caissier"} 
          onClose={() => setShowSessionStats(false)} 
        />
      )}

      {showReceipt && lastOrder && (
        <ReceiptModal 
          order={lastOrder} 
          onClose={() => setShowReceipt(false)} 
        />
      )}

      {showPaymentModal && (
        <PaymentModal 
          total={getTotal()}
          amountReceived={amountReceived}
          changeAmount={changeAmount}
          onKey={(key) => calculateChange(amountReceived + key)}
          onDelete={() => calculateChange(amountReceived.slice(0, -1))}
          onClear={() => calculateChange("")}
          onClose={() => setShowPaymentModal(false)}
          onFinalize={handleCheckout}
          isProcessing={isProcessing}
          promoCode={promoCode}
          onPromoChange={setPromoCode}
          onApplyPromo={handleApplyPromo}
          discount={discount}
          selectedCustomer={selectedCustomer}
          onCustomerSearch={handleCustomerSearch}
          customerResults={customerResults}
          onSelectCustomer={setSelectedCustomer}
        />
      )}

      {showReservationModal && tableForReservation && (
        <ReservationModal
          table={tableForReservation}
          storeId={storeId}
          onClose={() => setShowReservationModal(false)}
          existingReservations={reservations.filter(r => r.tableId === tableForReservation.id)}
        />
      )}

      {editingOptionsId && (
        <OptionsModal
          item={items.find(i => i.id === editingOptionsId)!}
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
          order={activeOrders.find(o => o.tableId === showTableStatusModal.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED')}
          onClose={() => setShowTableStatusModal(null)}
          onAddItems={() => {
            setSelectedTable(showTableStatusModal)
            setViewMode('POS')
            setShowTableStatusModal(null)
          }}
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
