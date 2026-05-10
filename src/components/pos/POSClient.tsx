'use client'

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  CreditCard, 
  Search, 
  Banknote, 
  Smartphone, 
  ChevronRight, 
  Trash2,
  User,
  LayoutGrid
} from "lucide-react"

import { useCart } from "@/store/useCart"
import { createOrder } from "@/app/actions/orders"
import { 
  saveCategoriesToIDB, 
  saveProductsToIDB, 
  getCategoriesFromIDB, 
  getProductsFromIDB, 
  addOrderToSyncQueue, 
  getSyncQueue 
} from "@/lib/idb"

// Sub-components
import { Sidebar } from "./subcomponents/Sidebar"
import { ProductCard } from "./subcomponents/ProductCard"
import { CartItem } from "./subcomponents/CartItem"
import { Numpad } from "./subcomponents/Numpad"
import { ReceiptModal } from "./subcomponents/ReceiptModal"
import { PaymentModal } from "./subcomponents/PaymentModal"

type PaymentMode = 'ESPECES' | 'CB' | 'MOBILE_MONEY'

interface POSClientProps {
  categories: any[]
  products: any[]
  storeId: string
  cashierId: string
}

export default function POSClient({ categories: initialCategories, products: initialProducts, storeId, cashierId }: POSClientProps) {
  const { data: session } = useSession()
  const isRestaurateur = session?.user?.role === 'RESTAURATEUR'
  
  const [categories, setCategories] = useState(initialCategories)
  const [products, setProducts] = useState(initialProducts)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [syncQueueCount, setSyncQueueCount] = useState(0)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ESPECES')
  const [showSessionStats, setShowSessionStats] = useState(false)
  const [sessionTotal, setSessionTotal] = useState(0) 
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [amountReceived, setAmountReceived] = useState("")
  const [changeAmount, setChangeAmount] = useState<number | null>(null)
  const [orderId, setOrderId] = useState<number | null>(null)

  const { items, addItem, removeItem, updateQuantity, getSubtotal, getTax, getTotal, clearCart } = useCart()

  useEffect(() => {
    setOrderId(Math.floor(1000 + Math.random() * 9000))
    const saved = localStorage.getItem(`cashier_total_${cashierId}`)
    if (saved) setSessionTotal(parseFloat(saved))
    
    const handleStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    
    loadOfflineData()
    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [cashierId])

  async function loadOfflineData() {
    if (initialCategories.length > 0) {
      await saveCategoriesToIDB(initialCategories)
      await saveProductsToIDB(initialProducts)
    } else {
      const cats = await getCategoriesFromIDB()
      const prods = await getProductsFromIDB()
      if (cats.length > 0) setCategories(cats)
      if (prods.length > 0) setProducts(prods)
    }
    const queue = await getSyncQueue()
    setSyncQueueCount(queue.length)
  }

  const calculateChange = (val: string) => {
    setAmountReceived(val)
    if (val === "") {
      setChangeAmount(null)
      return
    }
    const received = parseFloat(val)
    setChangeAmount(received - getTotal())
  }

  const handleCheckout = async () => {
    const currentTotal = getTotal()
    
    if (paymentMode === 'ESPECES' && !showPaymentModal) {
      setShowPaymentModal(true)
      return
    }

    setIsProcessing(true)
    const orderData = {
      storeId,
      cashierId,
      total: currentTotal,
      items: items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      })),
      type: 'DINE_IN',
      paymentMode
    }

    try {
      if (isOnline) {
        const res = await createOrder(orderData)
        if (res.success) {
          setLastOrder({ ...orderData, id: res.order.id })
          updateSessionStats(currentTotal)
          setShowReceipt(true)
          setShowPaymentModal(false)
          clearCart()
          setAmountReceived("")
          setChangeAmount(null)
        } else {
          alert(res.error || "Erreur de paiement")
        }
      } else {
        await addOrderToSyncQueue(orderData)
        const queue = await getSyncQueue()
        setSyncQueueCount(queue.length)
        updateSessionStats(currentTotal)
        setShowReceipt(true)
        setShowPaymentModal(false)
        clearCart()
        setAmountReceived("")
        setChangeAmount(null)
      }
    } catch (err) {
      alert("Erreur lors de la commande")
    } finally {
      setIsProcessing(false)
    }
  }

  const updateSessionStats = (amount: number) => {
    const newTotal = sessionTotal + amount
    setSessionTotal(newTotal)
    localStorage.setItem(`cashier_total_${cashierId}`, newTotal.toString())
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !activeCategory || p.categoryId === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex h-screen bg-[#f1f3f5] text-[#1a1d24] overflow-hidden font-sans">
      <Sidebar isRestaurateur={isRestaurateur} setShowSessionStats={setShowSessionStats} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between bg-white border-b border-[#e9ecef] z-20">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-black text-[#212529] tracking-tighter uppercase">Point de Vente</h1>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">Établissement #01 - Abidjan</span>
                <div className="w-1 h-1 rounded-full bg-[#adb5bd]" />
                <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isOnline ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#2f9e44]' : 'bg-[#e03131]'}`} />
                  {isOnline ? 'En Ligne' : 'Hors Ligne'}
                </span>
              </div>
            </div>
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
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">Mon solde jour</span>
              <span className="font-black text-[#212529] text-sm">{sessionTotal.toLocaleString()} FCFA</span>
            </div>
          </div>
        </header>

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
                onAdd={() => addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 })}
              />
            ))}
          </div>
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

        {/* 1. PAYMENT METHOD SELECTION - AT TOP */}
        <div className="px-8 py-4 bg-[#f8f9fa] border-b border-[#e9ecef]">
          <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block mb-3">Mode de Paiement</span>
          <div className="grid grid-cols-3 gap-2">
            <PaymentButton icon={<Banknote />} label="ESPÈCES" active={paymentMode === 'ESPECES'} onClick={() => setPaymentMode('ESPECES')} />
            <PaymentButton icon={<CreditCard />} label="CARTE" active={paymentMode === 'CB'} onClick={() => setPaymentMode('CB')} />
            <PaymentButton icon={<Smartphone />} label="MOBILE" active={paymentMode === 'MOBILE_MONEY'} onClick={() => setPaymentMode('MOBILE_MONEY')} />
          </div>
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
                onAdd={() => addItem({ productId: item.productId, name: item.name, price: item.price, quantity: 1 })}
                onSub={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
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
              onClick={handleCheckout}
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
        />
      )}
    </div>
  )
}

function PaymentButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all ${active ? 'bg-[#212529] border-[#212529] text-white shadow-lg' : 'bg-white border-[#e9ecef] text-[#adb5bd] hover:border-[#495057] hover:text-[#495057]'}`}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5" })}
      <span className="text-[9px] font-black tracking-widest">{label}</span>
    </button>
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
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Chiffre d'affaires Session</span>
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
