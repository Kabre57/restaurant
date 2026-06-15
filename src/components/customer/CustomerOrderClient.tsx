'use client'

import React, { useState, useMemo } from 'react'
import { BellRing, ChevronRight, Plus, Search, ShoppingBag, CheckCircle2, X } from 'lucide-react'
import { Product, Category } from '@prisma/client'
import Image from 'next/image'
import { createOrder } from '@/app/actions/orders/orders'
import { verifyPromoCode } from '@/app/actions/catalog/promotions'
import CustomerCartModal, { CartItem, getItemKey } from './CustomerCartModal'

interface CustomerOrderClientProps {
  products: (Product & { category: Category })[]
  categories: Category[]
  storeName: string
  tableNumber: number
  storeId: string
  tableId: string
  productOptions: {
    id: string
    name: string
    price: number
    type: 'SUPPLEMENT' | 'REMOVAL'
    categoryId: string | null
  }[]
}

type CustomerPaymentData = {
  method: 'ESPECES' | 'MOBILE_MONEY'
  provider?: string
  phone?: string
  promoCode?: string
}

// 3D Emojis map for products without custom images
function getProductEmoji(name: string, categoryName: string): string {
  const normName = name.toLowerCase()
  const normCat = categoryName.toLowerCase()

  if (normName.includes('burger')) return '🍔'
  if (normName.includes('frite') || normName.includes('patate')) return '🍟'
  if (normName.includes('coca') || normName.includes('soda') || normName.includes('boisson') || normName.includes('eau') || normName.includes('jus')) return '🥤'
  if (normName.includes('wrap') || normName.includes('poulet')) return '🌯'
  if (normName.includes('salade')) return '🥗'
  if (normName.includes('dessert') || normName.includes('glace') || normName.includes('gateau')) return '🍰'
  if (normName.includes('pizza')) return '🍕'

  if (normCat.includes('burger')) return '🍔'
  if (normCat.includes('accompagnement')) return '🍟'
  if (normCat.includes('boisson')) return '🥤'
  if (normCat.includes('dessert')) return '🍰'

  return '🍽️'
}

// Customizations dynamic generation is now handled inside the component with useMemo

export default function CustomerOrderClient({
  products,
  categories,
  storeName,
  tableNumber,
  storeId,
  tableId,
  productOptions
}: CustomerOrderClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCallingServer, setIsCallingServer] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [estimatedPrepMinutes, setEstimatedPrepMinutes] = useState<number | null>(null)

  // Customization Modal states
  const [customizingProduct, setCustomizingProduct] = useState<Product & { category: Category } | null>(null)
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([])
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([])
  const [specialInstructions, setSpecialInstructions] = useState('')

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch && p.isAvailable
    })
  }, [products, selectedCategory, searchQuery])

  const getCustomizationOptions = (product: Product & { category: Category }) => {
    const relevantOptions = productOptions.filter(
      opt => opt.categoryId === null || opt.categoryId === product.categoryId
    )
    return {
      supplements: relevantOptions.filter(o => o.type === 'SUPPLEMENT'),
      removals: relevantOptions.filter(o => o.type === 'REMOVAL')
    }
  }

  const openCustomizer = (product: Product & { category: Category }) => {
    setCustomizingProduct(product)
    setSelectedSupplements([])
    setSelectedRemovals([])
    setSpecialInstructions('')
  }

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return

    const options = getCustomizationOptions(customizingProduct)
    const priceAdjustment = selectedSupplements.reduce((sum, name) => {
      const matched = options.supplements.find(opt => opt.name === name)
      return sum + (matched?.price || 0)
    }, 0)

    const newItem: CartItem = {
      product: customizingProduct,
      quantity: 1,
      customization: {
        supplements: [...selectedSupplements],
        removals: [...selectedRemovals],
        instructions: specialInstructions,
        priceAdjustment
      }
    }

    setCart((prev) => {
      const itemKey = getItemKey(newItem)
      const existingIdx = prev.findIndex(item => getItemKey(item) === itemKey)
      if (existingIdx > -1) {
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, newItem]
    })

    setCustomizingProduct(null)
  }

  const addToCartFromCartModal = (itemToIncrement: CartItem) => {
    const itemKey = getItemKey(itemToIncrement)
    setCart((prev) => {
      return prev.map((item) =>
        getItemKey(item) === itemKey ? { ...item, quantity: item.quantity + 1 } : item
      )
    })
  }

  const removeFromCartFromCartModal = (itemKey: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => getItemKey(item) === itemKey)
      if (idx === -1) return prev
      const existing = prev[idx]
      if (existing.quantity === 1) {
        return prev.filter((_, i) => i !== idx)
      }
      return prev.map((item, i) =>
        i === idx ? { ...item, quantity: item.quantity - 1 } : item
      )
    })
  }

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const basePrice = item.product.price
      const adjustment = item.customization?.priceAdjustment || 0
      return total + (basePrice + adjustment) * item.quantity
    }, 0)
  }, [cart])

  const handleCallServer = async () => {
    setIsCallingServer(true)
    try {
      const response = await fetch('/api/call-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, tableId, tableNumber }),
      })

      if (!response.ok) {
        const result = await response.json()
        alert(result.error || 'Impossible d’appeler un serveur')
        return
      }

      alert('Un serveur a été prévenu.')
    } catch (error) {
      console.error('Call server error:', error)
      alert('Impossible d’appeler un serveur')
    } finally {
      setIsCallingServer(false)
    }
  }

  const handleSubmitOrder = async (paymentData: CustomerPaymentData) => {
    if (cart.length === 0) return
    setIsSubmitting(true)

    let finalTotal = cartTotal
    let discount = 0
    let promotionId: string | undefined

    if (paymentData.promoCode) {
      const mappedItems = cart.map((item) => ({
        productId: item.product.id,
        price: item.product.price + (item.customization?.priceAdjustment || 0),
        quantity: item.quantity,
      }))
      const promo = await verifyPromoCode(paymentData.promoCode, storeId, cartTotal, mappedItems)
      if (!promo.success) {
        alert(promo.error || 'Code promotionnel invalide')
        setIsSubmitting(false)
        return
      }

      finalTotal = promo.total ?? cartTotal
      discount = promo.discount ?? 0
      promotionId = promo.promotionId
    }

    const orderData = {
      storeId,
      tableId,
      total: finalTotal,
      type: 'DINE_IN' as const,
      paymentMode: paymentData.method,
      paymentStatus: 'EN_ATTENTE' as const,
      promotionId,
      discount,
      externalPayload: {
        source: 'TABLE_MENU',
        payment: paymentData.method === 'MOBILE_MONEY' ? {
          method: 'MOBILE_MONEY',
          provider: paymentData.provider,
          phone: paymentData.phone,
          status: 'CREATED_PENDING_INITIALIZATION',
        } : {
          method: 'PAY_AT_COUNTER',
          status: 'PAYMENT_AT_COUNTER_PENDING',
        },
        // We include customization logs so the POS and Waiter can view details of the order!
        customizations: cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          supplements: item.customization?.supplements || [],
          removals: item.customization?.removals || [],
          instructions: item.customization?.instructions || '',
          priceAdjustment: item.customization?.priceAdjustment || 0
        }))
      },
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price + (item.customization?.priceAdjustment || 0),
        options: item.customization ? JSON.stringify({
          supplements: item.customization.supplements,
          removals: item.customization.removals,
          instructions: item.customization.instructions
        }) : undefined
      })),
    }

    try {
      const result = await createOrder(orderData)
      if (result.success) {
        if (paymentData.method === 'MOBILE_MONEY') {
          const paymentResponse = await fetch('/api/payments/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: result.order?.id,
              provider: paymentData.provider,
              phone: paymentData.phone,
              amount: finalTotal,
            }),
          })
          const paymentResult = await paymentResponse.json()

          if (!paymentResponse.ok || !paymentResult.paymentUrl) {
            alert(paymentResult.error || 'Le paiement mobile n’a pas pu être initialisé')
            return
          }

          window.location.href = paymentResult.paymentUrl
          return
        }

        setEstimatedPrepMinutes(result.order?.estimatedPrepMinutes ?? null)
        setOrderComplete(true)
        setCart([])
        setIsCartOpen(false)
      } else {
        alert(result.error || 'Erreur lors de la commande')
      }
    } catch (error) {
      console.error('Order error:', error)
      alert('Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeCustomizationOptions = customizingProduct
    ? getCustomizationOptions(customizingProduct)
    : { supplements: [], removals: [] }

  const customizingPriceTotal = useMemo(() => {
    if (!customizingProduct) return 0
    const base = customizingProduct.price
    const adjustment = selectedSupplements.reduce((sum, name) => {
      const matched = activeCustomizationOptions.supplements.find(opt => opt.name === name)
      return sum + (matched?.price || 0)
    }, 0)
    return base + adjustment
  }, [customizingProduct, selectedSupplements, activeCustomizationOptions])

  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-[#171717] mb-2">Commande envoyée !</h1>
        <p className="text-sm font-semibold text-[#868e96] mb-8 max-w-xs">
          Votre commande pour la <span className="font-bold text-[#171717]">Table {tableNumber}</span> est en cours de préparation en cuisine.
        </p>
        {estimatedPrepMinutes ? (
          <p className="text-xs font-black text-[#FF6D00] mb-8">
            Temps estimé : environ {estimatedPrepMinutes} min
          </p>
        ) : null}
        <button
          onClick={() => setOrderComplete(false)}
          className="bg-[#171717] hover:bg-black text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-[10px]"
        >
          Commander autre chose
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8] font-sans pb-32">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-8 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6D00] text-white shadow-md shadow-orange-500/10">
            <ShoppingBag className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-[#171717]">Tableau {tableNumber}</h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#868e96]">{storeName.toUpperCase()}</p>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-[22rem]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#adb5bd]" />
          <input
            type="text"
            placeholder="Rechercher un plat..."
            className="w-full rounded-2xl bg-[#F8F9FA] border border-[#E5E7EB] py-2.5 pl-11 pr-4 text-xs font-bold text-[#171717] placeholder-[#adb5bd] outline-none focus:border-[#FF6D00] transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Category Selection pills */}
      <div className="px-8 py-5 flex items-center gap-3 overflow-x-auto custom-scrollbar bg-white border-b border-[#E5E7EB] shrink-0">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-[#FF6D00] text-white border-transparent shadow-md shadow-orange-500/10'
              : 'bg-white text-[#495057] border-[#E5E7EB] hover:bg-[#F8F9FA]'
          }`}
        >
          Tous
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-[#FF6D00] text-white border-transparent shadow-md shadow-orange-500/10'
                : 'bg-white text-[#495057] border-[#E5E7EB] hover:bg-[#F8F9FA]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main product display grid */}
      <main className="flex-1 px-8 py-8 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center max-w-xl mx-auto mt-10">
            <p className="text-xs font-black uppercase tracking-widest text-[#171717]">Aucun produit disponible</p>
            <p className="mt-2 text-xs font-semibold text-[#868e96]">La carte sera bientôt complétée par notre équipe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const emoji = getProductEmoji(product.name, product.category.name)
              return (
                <article
                  key={product.id}
                  onClick={() => openCustomizer(product)}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md hover:border-[#FF6D00] transition-all flex flex-col justify-between h-[21rem] group cursor-pointer"
                >
                  {/* Image/Emoji area */}
                  <div className="bg-[#F8F9FA] rounded-2xl flex items-center justify-center h-40 mb-4 overflow-hidden relative border border-[#E5E7EB]/50">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-5xl select-none group-hover:scale-110 transition-transform duration-300">{emoji}</span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-[#171717] leading-tight truncate">{product.name}</h3>
                    <p className="text-[10px] font-bold text-[#868e96] line-clamp-2 h-7 leading-relaxed">
                      {product.description || 'Spécialité du chef fraîchement préparée pour vous.'}
                    </p>
                  </div>

                  {/* Price and add action */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-black text-[#FF6D00]">
                      {product.price.toLocaleString()} F CFA
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openCustomizer(product)
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6D00]/10 text-[#FF6D00] hover:bg-[#FF6D00] hover:text-white transition-all shadow-sm"
                      aria-label={`Ajouter ${product.name}`}
                    >
                      <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* Customize / Personnaliser Modal matching Screenshot 2 */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#171717]">Personnaliser</h2>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="p-1.5 hover:bg-[#F8F9FA] rounded-full text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {/* Product Info Block */}
              <div className="flex gap-4 bg-[#F8F9FA] rounded-2xl p-4 border border-[#E5E7EB]/50">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shrink-0 border border-[#E5E7EB]">
                  {customizingProduct.image ? (
                    <div className="relative w-full h-full rounded-xl overflow-hidden">
                      <Image
                        src={customizingProduct.image}
                        alt={customizingProduct.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <span className="text-3xl select-none">{getProductEmoji(customizingProduct.name, customizingProduct.category.name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-[#171717]">{customizingProduct.name}</h3>
                  <p className="text-[10px] font-bold text-[#868e96] mt-1 leading-relaxed">
                    {customizingProduct.description || 'Option personnalisable selon vos préférences.'}
                  </p>
                </div>
              </div>

              {/* Supplements Section */}
              {activeCustomizationOptions.supplements.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#171717]">Suppléments</h4>
                    <span className="text-[9px] font-bold text-[#868e96] bg-[#F8F9FA] px-2 py-0.5 rounded-lg border border-[#E5E7EB]">Optionnel</span>
                  </div>
                  <div className="space-y-2">
                    {activeCustomizationOptions.supplements.map((opt) => {
                      const isSelected = selectedSupplements.includes(opt.name)
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between border rounded-2xl p-4 cursor-pointer transition-colors ${
                            isSelected ? 'border-[#FF6D00] bg-[#FF6D00]/5' : 'border-[#E5E7EB] bg-white hover:border-[#FF6D00]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedSupplements((prev) =>
                                  isSelected ? prev.filter((x) => x !== opt.name) : [...prev, opt.name]
                                )
                              }}
                              className="w-4 h-4 rounded text-[#FF6D00] border-[#E5E7EB] focus:ring-[#FF6D00]"
                            />
                            <span className="text-xs font-black text-[#171717]">{opt.name}</span>
                          </div>
                          <span className="text-xs font-black text-[#FF6D00]">+ {opt.price.toLocaleString()} F CFA</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Ingredients Removal Section */}
              {activeCustomizationOptions.removals.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#171717]">Retirer des ingrédients</h4>
                    <span className="text-[9px] font-bold text-[#868e96] bg-[#F8F9FA] px-2 py-0.5 rounded-lg border border-[#E5E7EB]">Optionnel</span>
                  </div>
                  <div className="space-y-2">
                    {activeCustomizationOptions.removals.map((opt) => {
                      const isSelected = selectedRemovals.includes(opt.name)
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 border rounded-2xl p-4 cursor-pointer transition-colors ${
                            isSelected ? 'border-[#FF6D00] bg-[#FF6D00]/5' : 'border-[#E5E7EB] bg-white hover:border-[#FF6D00]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedRemovals((prev) =>
                                isSelected ? prev.filter((x) => x !== opt.name) : [...prev, opt.name]
                              )
                            }}
                            className="w-4 h-4 rounded text-[#FF6D00] border-[#E5E7EB] focus:ring-[#FF6D00]"
                          />
                          <span className="text-xs font-black text-[#171717]">{opt.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions Section */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#171717] mb-3">Instructions spéciales</h4>
                <textarea
                  placeholder="Ex: sans sel, viande bien cuite, sauce à part..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full min-h-[5rem] rounded-2xl border border-[#E5E7EB] bg-white p-4 text-xs font-bold text-black outline-none placeholder-[#adb5bd] focus:border-[#FF6D00] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Bottom Actions footer */}
            <div className="p-6 border-t border-[#E5E7EB] bg-white sticky bottom-0 z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#868e96]">Prix total</p>
                <p className="text-base font-black text-[#171717] mt-0.5">{customizingPriceTotal.toLocaleString()} F CFA</p>
              </div>
              <button
                onClick={handleConfirmCustomization}
                className="bg-[#171717] hover:bg-black text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 shadow-md shadow-black/10"
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server call floating button */}
      <button
        type="button"
        onClick={handleCallServer}
        disabled={isCallingServer}
        className="fixed bottom-24 right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#E5E7EB] text-[#171717] shadow-lg hover:bg-[#F8F9FA] transition-all disabled:opacity-50"
        aria-label="Appeler un serveur"
        title="Appeler un serveur"
      >
        <BellRing className={`h-5.5 w-5.5 ${isCallingServer ? 'animate-pulse' : ''}`} />
      </button>

      {/* Floating Cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-[#1C1C1E] text-white rounded-[20px] h-[52px] w-full max-w-sm shadow-xl flex items-center justify-between px-4 transition-transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#333333] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </div>
              <span className="text-sm font-semibold">Voir le panier</span>
            </div>
            <span className="text-sm font-semibold">{cartTotal.toLocaleString()} F CFA</span>
          </button>
        </div>
      )}

      {/* Cart Modal component */}
      <CustomerCartModal
        cart={cart}
        cartTotal={cartTotal}
        isSubmitting={isSubmitting}
        onRemoveFromCart={removeFromCartFromCartModal}
        onAddToCart={addToCartFromCartModal}
        onSubmitOrder={handleSubmitOrder}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </div>
  )
}
