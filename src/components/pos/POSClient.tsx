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
import FloorPlanView from "./FloorPlanView"
import ReservationModal from "./ReservationModal"
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
      alert(res.error)
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
          changeAmount: mode === 'ESPECES' ? changeAmount : 0
        })
        setShowReceipt(true)
        advanceOrderId()
        setShowPaymentModal(false)
        setAmountReceived("")
        setChangeAmount(null)
        setSelectedTable(null)
        setViewMode('FLOOR_PLAN')
      } else {
        alert(res.error || "Erreur lors de l'ajout à la commande existante")
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
          alert(res.error || "Erreur de paiement")
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
        <header className="h-20 px-8 flex items-center justify-between bg-white border-b border-[#e9ecef] z-20">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-black text-[#212529] tracking-tighter uppercase">Point de Vente</h1>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">
                  {viewMode === 'FLOOR_PLAN' ? 'Plan de Salle' : `Table ${selectedTable?.number || 'Directe'}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'POS' && (
              <button 
                onClick={() => {
                  setViewMode('FLOOR_PLAN')
                  setSelectedTable(null)
                }}
                className="flex items-center gap-2 bg-[#f1f3f5] hover:bg-[#e9ecef] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <MapIcon className="w-4 h-4" />
                Changer Table
              </button>
            )}
          </div>

          <div className="flex-1 max-w-xl mx-12">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd] group-focus-within:text-[#212529] transition-colors" />
              <input 
                type="text" 
                placeholder="RECHERCHER UN PRODUIT..." 
                className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-2xl pl-12 pr-4 py-3 text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-[#212529] focus:bg-white transition-all uppercase tracking-widest"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus
              isOnline={isOnline}
              isSyncing={isSyncing}
              queueCount={syncQueueCount}
              onSyncNow={() => void syncPendingOrders()}
            />
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">Mon solde jour</span>
              <span className="font-black text-[#212529] text-sm">{sessionTotal.toLocaleString()} FCFA</span>
            </div>
          </div>
        </header>

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
    </div>
  )
}

function ReservationsList({ reservations }: { reservations: Reservation[] }) {
  const sorted = [...reservations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex-1 p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-[#212529] uppercase tracking-tighter mb-10">Réservations du Jour</h2>
        <div className="space-y-4">
          {sorted.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] text-center border border-[#e9ecef] shadow-sm">
              <p className="font-black text-[#adb5bd] uppercase tracking-widest text-sm">Aucune réservation pour le moment</p>
            </div>
          ) : (
            sorted.map(res => (
              <div key={res.id} className="bg-white p-6 rounded-[2rem] border border-[#e9ecef] shadow-sm hover:shadow-xl transition-all flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#f8f9fa] rounded-2xl flex flex-col items-center justify-center border border-[#e9ecef]">
                    <span className="text-[10px] font-black text-[#adb5bd] uppercase">{new Date(res.date).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                    <span className="text-xl font-black text-[#212529]">{new Date(res.date).getHours()}:{new Date(res.date).getMinutes().toString().padStart(2, '0')}</span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-[#212529] uppercase tracking-tight">{res.customerName}</h4>
                    <p className="text-xs font-bold text-[#adb5bd] uppercase tracking-widest">{res.phone} • {res.guests} Personnes</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    res.status === 'CONFIRMED' ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff4e6] text-[#f08c00]'
                  }`}>
                    {res.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function TableStatusModal({ table, order, onClose, onAddItems }: { table: Table, order: any, onClose: () => void, onAddItems: () => void }) {
  if (!order) return null

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase()
    if (s === 'EN_ATTENTE') return 'text-[#e03131] bg-[#fff5f5]'
    if (s === 'PREPARATION' || s === 'PRÉPARATION') return 'text-[#f08c00] bg-[#fff4e6]'
    if (s === 'PRET' || s === 'PRÊT') return 'text-[#2f9e44] bg-[#ebfbee]'
    return 'text-[#adb5bd] bg-[#f8f9fa]'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Table {table.number}</h2>
            <div className={`mt-2 inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
              {order.status}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Total Actuel</p>
            <p className="text-2xl font-black text-[#212529]">{order.total?.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="space-y-4 mb-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-[#f8f9fa] rounded-2xl border border-[#e9ecef]">
              <div className="flex-1">
                <p className="text-xs font-black text-[#212529] uppercase">{item.product.name}</p>
                {item.options && <p className="text-[9px] font-bold text-[#e03131] uppercase mt-1">Note: {item.options}</p>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black bg-white px-3 py-1 rounded-lg border border-[#e9ecef]">x{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Fermer</button>
          <button onClick={onAddItems} className="flex-[1.5] py-5 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter des articles
          </button>
        </div>
      </div>
    </div>
  )
}


function OptionsModal({ item, onSave, onClose }: { item: CartItemType | undefined, onSave: (val: string) => void, onClose: () => void }) {
  const [val, setVal] = useState(item?.options || "")
  
  if (!item) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-2">Options</h2>
        <p className="text-xs font-bold text-[#adb5bd] mb-6 uppercase tracking-widest">{item.name}</p>
        
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Ex: Saignant, sans oignons..."
          className="w-full h-32 bg-[#f8f9fa] border border-[#e9ecef] rounded-2xl p-4 text-sm font-bold text-[#212529] focus:ring-2 focus:ring-[#212529] outline-none resize-none mb-6"
          autoFocus
        />

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Annuler</button>
          <button onClick={() => onSave(val)} className="flex-1 py-4 bg-[#212529] hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl">Valider</button>
        </div>
      </div>
    </div>
  )
}

function CashierStatsModal({ total, cashierName, onClose }: { total: number, cashierName: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-[#f1f3f5] rounded-3xl flex items-center justify-center mb-6">
            <User className="w-10 h-10 text-[#212529]" />
          </div>
          <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Session Caissier</h2>
          <p className="text-sm font-bold text-[#adb5bd] uppercase tracking-widest mt-1">{cashierName}</p>
        </div>
        <div className="mt-10 space-y-4">
          <div className="bg-[#f8f9fa] p-6 rounded-3xl border border-[#dee2e6] text-center">
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Chiffre d&apos;affaires Session</span>
            <span className="text-4xl font-black text-[#212529]">{total.toLocaleString()} <span className="text-lg">FCFA</span></span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#dee2e6] text-center">
              <span className="text-[9px] font-black text-[#adb5bd] uppercase block mb-1">Commandes</span>
              <span className="text-xl font-black text-[#212529]">24</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#dee2e6] text-center">
              <span className="text-[9px] font-black text-[#adb5bd] uppercase block mb-1">Status</span>
              <span className="text-xs font-black text-[#2f9e44] uppercase tracking-widest">Actif</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-full mt-10 bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">Fermer</button>
      </div>
    </div>
  )
}
