'use client'

import React, { useState, useEffect, useCallback } from "react"
import { ShoppingCart, Utensils, CreditCard, Menu, Bell, User, Clock, Search, Trash2, Wifi, WifiOff, Banknote, Smartphone, LayoutGrid } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/store/useCart"
import { createOrder } from "@/app/actions/orders"
import { saveCategoriesToIDB, saveProductsToIDB, getCategoriesFromIDB, getProductsFromIDB, addOrderToSyncQueue, getSyncQueue, clearSyncQueueItem } from "@/lib/idb"

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentMode = 'ESPECES' | 'CB' | 'MOBILE_MONEY'

type Category = {
  id: string
  name: string
  icon: string | null
}

type Product = {
  id: string
  categoryId: string
  name: string
  price: number
  image: string | null
  isAvailable?: boolean
}

interface POSClientProps {
  categories: Category[]
  products: Product[]
  storeId: string
  cashierId: string
}

// ─── Composant Principal ──────────────────────────────────────────────────────
export default function POSClient({ categories: initialCategories, products: initialProducts, storeId, cashierId }: POSClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [products, setProducts]     = useState<Product[]>(initialProducts)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery]       = useState("")
  const [isProcessing, setIsProcessing]     = useState(false)
  const [isOnline, setIsOnline]             = useState(true)
  const [syncQueueCount, setSyncQueueCount] = useState(0)
  const [paymentMode, setPaymentMode]       = useState<PaymentMode>('ESPECES')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const { items, addItem, removeItem, updateQuantity, getSubtotal, getTax, getTotal, clearCart } = useCart()

  // ── Initialisation Offline-First ──
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline  = () => { setIsOnline(true); syncOfflineOrders() }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    const initOfflineData = async () => {
      if (initialCategories.length > 0) {
        await saveCategoriesToIDB(initialCategories)
      } else {
        const local = await getCategoriesFromIDB()
        if (local.length > 0) setCategories(local)
      }
      if (initialProducts.length > 0) {
        await saveProductsToIDB(initialProducts)
      } else {
        const local = await getProductsFromIDB()
        if (local.length > 0) setProducts(local)
      }
      const queue = await getSyncQueue()
      setSyncQueueCount(queue.length)
    }
    initOfflineData()
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [initialCategories, initialProducts])

  const syncOfflineOrders = useCallback(async () => {
    const queue = await getSyncQueue()
    if (queue.length === 0) return
    for (const order of queue) {
      if (!order.id) continue
      try {
        const res = await createOrder({ storeId: order.storeId, cashierId: order.cashierId, total: order.total, type: order.type, items: order.items })
        if (res.success) await clearSyncQueueItem(order.id)
      } catch (err) {
        console.error("Échec de synchronisation:", order.id, err)
      }
    }
    const remaining = await getSyncQueue()
    setSyncQueueCount(remaining.length)
  }, [])

  // ── Filtrage des produits ──
  const filteredProducts = products.filter(p => {
    if (p.isAvailable === false) return false
    const matchesSearch    = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory  = activeCategory ? p.categoryId === activeCategory : true
    return matchesSearch && matchesCategory
  })

  // ── Encaissement ──
  const handleCheckout = async () => {
    if (items.length === 0) return
    setShowPaymentModal(false)
    setIsProcessing(true)
    try {
      const orderData = {
        storeId,
        cashierId,
        total: getTotal(),
        type: 'DINE_IN' as const,
        items: items.map(item => ({ productId: item.productId, quantity: item.quantity, price: item.price, options: item.options }))
      }
      if (isOnline) {
        const res = await createOrder(orderData as any)
        if (res.success) {
          alert(`✅ Commande payée en ${paymentMode === 'ESPECES' ? 'espèces' : paymentMode === 'CB' ? 'carte bancaire' : 'Mobile Money'} !`)
          clearCart()
        } else {
          alert(res.error || "Erreur lors du paiement")
        }
      } else {
        await addOrderToSyncQueue(orderData)
        const queue = await getSyncQueue()
        setSyncQueueCount(queue.length)
        alert("📴 Réseau indisponible. Commande sauvegardée hors-ligne ! (Synchronisation automatique dès que le réseau revient)")
        clearCart()
      }
    } catch (error) {
      console.error(error)
      alert("Erreur système lors du paiement")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-100 overflow-hidden font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-24 bg-[#1a1d24] flex flex-col items-center py-6 border-r border-[#2a2e37] justify-between z-20 relative">
        <div className="flex flex-col gap-8 w-full items-center">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Utensils className="text-white w-6 h-6" />
          </div>
          <NavIcon icon={<Menu />}         label="Menu"      active />
          <NavIcon icon={<Clock />}        label="Commandes" />
          <NavIcon icon={<Bell />}         label="KDS"       href="/kds" />
          <NavIcon icon={<LayoutGrid />}   label="Produits"  href="/admin/produits" />
          <NavIcon icon={<ShoppingCart />} label="Stock" />
        </div>
        <div className="flex flex-col gap-6 w-full items-center">
          <NavIcon icon={<User />} label="Profil" />
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main className="flex-1 flex flex-col h-full bg-[#0a0c10]">

        {/* Header */}
        <header className="h-24 px-8 flex items-center justify-between border-b border-[#2a2e37] bg-[#14161b]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Prise de Commande
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
                  <Wifi className="w-3.5 h-3.5" /> En Ligne
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium bg-red-500/10 text-red-400 px-2 py-1 rounded-full border border-red-500/20">
                  <WifiOff className="w-3.5 h-3.5" /> Hors Ligne
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Caisse Principale • Abidjan, Côte d&apos;Ivoire
              {syncQueueCount > 0 && <span className="ml-3 text-yellow-400 font-medium">({syncQueueCount} à synchroniser)</span>}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1a1d24] text-white pl-10 pr-4 py-2.5 rounded-full border border-[#2a2e37] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-64 placeholder:text-gray-500"
            />
          </div>
        </header>

        {/* Filtres Catégorie */}
        <div className="px-8 pt-6 pb-4 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <CategoryPill label="Tous" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
          {categories.map(cat => (
            <CategoryPill key={cat.id} label={cat.name} icon={cat.icon || ""} active={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id)} />
          ))}
        </div>

        {/* Grille Produits */}
        <div className="flex-1 px-8 pb-8 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={categories.find(c => c.id === product.categoryId)?.name || ""}
                onAdd={() => addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 })}
              />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-500 gap-3">
                <Search className="w-10 h-10 opacity-30" />
                <p>Aucun produit trouvé.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Panier / Ticket ── */}
      <aside className="w-[400px] bg-[#14161b] border-l border-[#2a2e37] flex flex-col shadow-2xl relative z-10">
        <div className="p-6 border-b border-[#2a2e37] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Panier Courant</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-500/20">Sur place</span>
              <span>• Caissier</span>
            </div>
          </div>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Articles du panier */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4" style={{ scrollbarWidth: 'none' }}>
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p>Votre panier est vide</p>
            </div>
          ) : (
            items.map(item => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                onDecrease={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
              />
            ))
          )}
        </div>

        {/* Récapitulatif + Paiement */}
        <div className="p-6 bg-[#1a1d24] border-t border-[#2a2e37] rounded-tl-3xl mt-auto">
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-gray-400 text-sm">
              <span>Sous-total</span>
              <span>{getSubtotal().toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-gray-400 text-sm">
              <span>TVA (18%)</span>
              <span>{getTax().toLocaleString()} FCFA</span>
            </div>
            <div className="h-px bg-[#2a2e37]" />
            <div className="flex justify-between text-white text-xl font-bold">
              <span>Total à Payer</span>
              <span>{getTotal().toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* Sélecteur Mode de Paiement */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <PaymentBtn mode="ESPECES"      icon={<Banknote className="w-4 h-4" />}    label="Espèces"      active={paymentMode === 'ESPECES'}      onClick={() => setPaymentMode('ESPECES')} />
            <PaymentBtn mode="CB"           icon={<CreditCard className="w-4 h-4" />}  label="Carte"        active={paymentMode === 'CB'}           onClick={() => setPaymentMode('CB')} />
            <PaymentBtn mode="MOBILE_MONEY" icon={<Smartphone className="w-4 h-4" />}  label="Mobile Money" active={paymentMode === 'MOBILE_MONEY'} onClick={() => setPaymentMode('MOBILE_MONEY')} />
          </div>

          {/* Bouton Encaisser */}
          <button
            onClick={handleCheckout}
            disabled={items.length === 0 || isProcessing}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-between px-6 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/25"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {isProcessing ? "Traitement..." : "Encaisser"}
            </span>
            <span>{getTotal().toLocaleString()} FCFA</span>
          </button>
        </div>
      </aside>
    </div>
  )
}

// ─── Bouton Mode de Paiement ──────────────────────────────────────────────────
function PaymentBtn({ icon, label, active, onClick }: { mode: PaymentMode, icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
        active
          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
          : 'bg-[#2a2e37] border-[#3a3e47] text-gray-400 hover:text-gray-200 hover:border-gray-500'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ─── Icône Sidebar ────────────────────────────────────────────────────────────
function NavIcon({ icon, active, label, href }: { icon: React.ReactNode, active?: boolean, label: string, href?: string }) {
  const content = (
    <div className="group flex flex-col items-center gap-1 cursor-pointer w-full">
      <div className={`p-3 rounded-xl transition-all duration-300 relative ${active ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2e37]'}`}>
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />}
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
      </div>
      <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-emerald-400' : 'text-gray-500'}`}>{label}</span>
    </div>
  )
  return href ? <Link href={href} className="w-full">{content}</Link> : content
}

// ─── Pilule Catégorie ──────────────────────────────────────────────────────────
function CategoryPill({ label, icon, active, onClick }: { label: string, icon?: string, active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 font-medium ${
        active
          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
          : 'bg-[#1a1d24] text-gray-400 hover:text-white hover:bg-[#2a2e37] border border-[#2a2e37]'
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  )
}

// ─── Carte Produit ────────────────────────────────────────────────────────────
function ProductCard({ product, categoryName, onAdd }: { product: Product, categoryName: string, onAdd: () => void }) {
  const emoji = getCategoryEmoji(categoryName)

  return (
    <div
      onClick={onAdd}
      className="bg-[#1a1d24] rounded-2xl overflow-hidden border border-[#2a2e37] hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group flex flex-col h-full hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5"
    >
      {/* Image / Placeholder */}
      <div className="h-40 bg-[#2a2e37] relative overflow-hidden flex items-center justify-center">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-6xl opacity-50 select-none group-hover:scale-110 transition-transform duration-300">
            {emoji}
          </div>
        )}
        <div className="absolute top-3 right-3 bg-[#0a0c10]/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-emerald-400 border border-[#2a2e37]">
          {categoryName}
        </div>
      </div>

      {/* Infos produit */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight">{product.name}</h3>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold text-xl text-emerald-400">
            {product.price.toLocaleString()} <span className="text-sm text-emerald-500/70 font-medium">FCFA</span>
          </span>
          <div className="w-8 h-8 rounded-full bg-[#2a2e37] flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <span className="text-xl leading-none mb-0.5">+</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Article du Panier ────────────────────────────────────────────────────────
function CartItem({ item, onIncrease, onDecrease }: { item: any, onIncrease: () => void, onDecrease: () => void }) {
  return (
    <div className="flex gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
        ×{item.quantity}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-white leading-tight">{item.name}</h4>
        <span className="text-sm font-bold text-emerald-400 mt-1 block">{(item.price * item.quantity).toLocaleString()} FCFA</span>
      </div>
      <div className="flex flex-col gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onIncrease} className="w-6 h-6 rounded bg-[#2a2e37] hover:bg-emerald-500 hover:text-white flex items-center justify-center text-xs font-bold transition-colors">+</button>
        <button onClick={onDecrease} className="w-6 h-6 rounded bg-[#2a2e37] hover:bg-red-500 hover:text-white flex items-center justify-center text-xs font-bold transition-colors">−</button>
      </div>
    </div>
  )
}

// ─── Utilitaire Emoji par catégorie ──────────────────────────────────────────
function getCategoryEmoji(categoryName: string): string {
  const name = categoryName.toLowerCase()
  if (name.includes('burger') || name.includes('sandwich')) return '🍔'
  if (name.includes('poulet') || name.includes('chicken'))  return '🍗'
  if (name.includes('pizza'))                               return '🍕'
  if (name.includes('boisson') || name.includes('drink'))   return '🥤'
  if (name.includes('dessert') || name.includes('glace'))   return '🍰'
  if (name.includes('salade') || name.includes('légume'))   return '🥗'
  if (name.includes('frite') || name.includes('accomp'))    return '🍟'
  if (name.includes('sauce'))                               return '🫙'
  return '🍽️'
}
