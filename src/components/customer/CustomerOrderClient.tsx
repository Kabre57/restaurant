'use client';

import React, { useState, useMemo } from 'react';
import { BellRing, ChevronRight, Plus, Search, Utensils, CheckCircle2 } from 'lucide-react';
import { Product, Category } from '@prisma/client';
import Image from 'next/image';
import { createOrder } from '@/app/actions/orders';
import { verifyPromoCode } from '@/app/actions/promotions';
import CustomerCartModal from './CustomerCartModal';

interface CustomerOrderClientProps {
  products: (Product & { category: Category })[];
  categories: Category[];
  storeName: string;
  tableNumber: number;
  storeId: string;
  tableId: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type CustomerPaymentData = {
  method: 'ESPECES' | 'MOBILE_MONEY';
  provider?: string;
  phone?: string;
  promoCode?: string;
};

export default function CustomerOrderClient({
  products,
  categories,
  storeName,
  tableNumber,
  storeId,
  tableId
}: CustomerOrderClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCallingServer, setIsCallingServer] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [estimatedPrepMinutes, setEstimatedPrepMinutes] = useState<number | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && p.isAvailable;
    });
  }, [products, selectedCategory, searchQuery]);

  const menuSections = useMemo(() => {
    const visibleCategories = selectedCategory === 'all'
      ? categories
      : categories.filter((category) => category.id === selectedCategory);

    return visibleCategories
      .map((category) => ({
        category,
        products: filteredProducts.filter((product) => product.categoryId === category.id),
      }))
      .filter((section) => section.products.length > 0);
  }, [categories, filteredProducts, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing?.quantity === 1) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }, [cart]);

  const handleCallServer = async () => {
    setIsCallingServer(true);

    try {
      const response = await fetch('/api/call-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, tableId, tableNumber }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || 'Impossible d’appeler un serveur');
        return;
      }

      alert('Un serveur a été prévenu.');
    } catch (error) {
      console.error('Call server error:', error);
      alert('Impossible d’appeler un serveur');
    } finally {
      setIsCallingServer(false);
    }
  };

  const handleSubmitOrder = async (paymentData: CustomerPaymentData) => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    let finalTotal = cartTotal;
    let discount = 0;
    let promotionId: string | undefined;

    if (paymentData.promoCode) {
      const promo = await verifyPromoCode(paymentData.promoCode, storeId, cartTotal);
      if (!promo.success) {
        alert(promo.error || 'Code promotionnel invalide');
        setIsSubmitting(false);
        return;
      }

      finalTotal = promo.total ?? cartTotal;
      discount = promo.discount ?? 0;
      promotionId = promo.promotionId;
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
      externalPayload: paymentData.method === 'MOBILE_MONEY' ? {
        source: 'TABLE_MENU',
        payment: {
          method: 'MOBILE_MONEY',
          provider: paymentData.provider,
          phone: paymentData.phone,
          status: 'CREATED_PENDING_INITIALIZATION',
        },
      } : {
        source: 'TABLE_MENU',
        payment: {
          method: 'PAY_AT_COUNTER',
          status: 'PAYMENT_AT_COUNTER_PENDING',
        },
      },
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      })),
    };

    try {
      const result = await createOrder(orderData);
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
          });
          const paymentResult = await paymentResponse.json();

          if (!paymentResponse.ok || !paymentResult.paymentUrl) {
            alert(paymentResult.error || 'Le paiement mobile n’a pas pu être initialisé');
            return;
          }

          window.location.href = paymentResult.paymentUrl;
          return;
        }

        setEstimatedPrepMinutes(result.order?.estimatedPrepMinutes ?? null);
        setOrderComplete(true);
        setCart([]);
        setIsCartOpen(false);
      } else {
        alert(result.error || "Erreur lors de la commande");
      }
    } catch (error) {
      console.error("Order error:", error);
      alert("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Commande envoyée !</h1>
        <p className="text-slate-600 mb-8 max-w-xs">
          Votre commande pour la <span className="font-bold">Table {tableNumber}</span> est en cours de préparation en cuisine.
        </p>
        {estimatedPrepMinutes ? (
          <p className="text-sm font-bold text-orange-600 mb-8">
            Temps estime: environ {estimatedPrepMinutes} min
          </p>
        ) : null}
        <button
          onClick={() => setOrderComplete(false)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all active:scale-95"
        >
          Commander autre chose
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-pos-bg font-sans">
      <header className="sticky top-0 z-30 border-b border-pos-border bg-pos-surface px-4 py-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">Carte & Menu</p>
            <h1 className="text-2xl font-black text-pos-text tracking-tight">{storeName}</h1>
            <div className="flex items-center text-brand-600 font-bold text-sm">
              <Utensils className="w-4 h-4 mr-1" />
              <span>Table {tableNumber}</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
            <Utensils className="w-6 h-6 text-brand-600" />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pos-text-muted" />
          <input
            type="text"
            placeholder="Rechercher une entrée, un plat, une boisson..."
            className="w-full rounded-2xl border border-pos-border bg-pos-bg py-3 pl-12 pr-4 text-pos-text placeholder:text-pos-text-muted focus:ring-2 focus:ring-brand-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 py-6 overflow-x-auto flex space-x-3 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand-500 text-white shadow-md'
                : 'bg-pos-surface text-pos-text-muted border border-pos-border hover:bg-brand-50'
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-pos-surface text-pos-text-muted border border-pos-border hover:bg-brand-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="space-y-8 px-4">
          {menuSections.length === 0 && (
            <div className="rounded-3xl border border-dashed border-pos-border bg-pos-surface p-8 text-center">
              <p className="text-sm font-black uppercase tracking-widest text-pos-text">Aucun élément dans cette section</p>
              <p className="mt-2 text-sm font-semibold text-pos-text-muted">Le manager peut ajouter des plats, boissons et formules depuis l’espace Menu.</p>
            </div>
          )}
          {menuSections.map((section) => (
            <section key={section.category.id} className="space-y-3">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-pos-text">{section.category.name}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-pos-text-muted">
                  {section.products.length} choix disponibles
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {section.products.map((product) => {
                  const isDrink = product.category.name.toLowerCase().includes('boisson')
                  return (
                    <div
                      key={product.id}
                      className="group flex rounded-3xl border border-pos-border bg-pos-surface p-4 shadow-soft transition-all active:scale-[0.98]"
                    >
                      <div className="relative mr-4 h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-pos-bg to-pos-border/30 p-2">
                        {product.image ? (
                          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-white/90 shadow-[0_10px_24px_rgba(15,23,42,0.10)]">
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              unoptimized
                              sizes="96px"
                              className={`h-full w-full object-contain ${isDrink ? 'p-0.5 scale-[1.08]' : 'p-2'}`}
                            />
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/80 text-pos-text-muted">
                            <Utensils className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 text-lg font-black text-pos-text">{product.name}</h3>
                        <p className="mb-3 line-clamp-2 text-sm font-semibold text-pos-text-muted">
                          {product.description || 'Plat de la carte disponible à la commande.'}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-lg font-black text-brand-600">
                            {product.price.toLocaleString()} <span className="text-xs font-bold uppercase">FCFA</span>
                          </span>
                          <button
                            onClick={() => addToCart(product)}
                            className="rounded-xl bg-brand-50 p-2 text-brand-600 transition-all hover:bg-brand-500 hover:text-white"
                            aria-label={`Ajouter ${product.name}`}
                          >
                            <Plus className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <button
        type="button"
        onClick={handleCallServer}
        disabled={isCallingServer}
        className="fixed bottom-28 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition-all active:scale-95 disabled:bg-slate-400"
        aria-label="Appeler un serveur"
        title="Appeler un serveur"
      >
        <BellRing className={`h-6 w-6 ${isCallingServer ? 'animate-pulse' : ''}`} />
      </button>

      {cart.length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 z-40">
          <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center">
              <div className="bg-orange-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold mr-4">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total</p>
                <p className="text-xl font-black">
                  {cartTotal.toLocaleString()} <span className="text-xs uppercase">FCFA</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-white text-slate-900 font-bold px-6 py-3 rounded-2xl flex items-center group active:scale-95 transition-all"
            >
              Voir Panier
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      <CustomerCartModal
        cart={cart}
        cartTotal={cartTotal}
        isSubmitting={isSubmitting}
        onRemoveFromCart={removeFromCart}
        onAddToCart={addToCart}
        onSubmitOrder={handleSubmitOrder}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
