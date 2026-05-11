'use client';

import React, { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, Search, ChevronRight, Utensils, Clock, CheckCircle2 } from 'lucide-react';
import { Product, Category } from '@prisma/client';
import { createOrder } from '@/app/actions/orders';

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
  const [orderComplete, setOrderComplete] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && p.isAvailable;
    });
  }, [products, selectedCategory, searchQuery]);

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

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const orderData = {
      storeId,
      tableId,
      total: cartTotal,
      type: 'DINE_IN' as const,
      paymentMode: 'ESPECES', // Will be updated by cashier later
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      })),
    };

    try {
      const result = await createOrder(orderData);
      if (result.success) {
        setOrderComplete(true);
        setCart([]);
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
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{storeName}</h1>
            <div className="flex items-center text-orange-600 font-bold text-sm">
              <Utensils className="w-4 h-4 mr-1" />
              <span>Table {tableNumber}</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Utensils className="w-6 h-6 text-orange-600" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un plat..."
            className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        {/* Categories */}
        <div className="px-4 py-6 overflow-x-auto flex space-x-3 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
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
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="px-4 grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-3xl p-4 flex items-center shadow-sm border border-slate-100 active:scale-[0.98] transition-all group"
            >
              <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden mr-4 relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Utensils className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg mb-1">{product.name}</h3>
                <p className="text-slate-500 text-sm mb-2 line-clamp-1">
                  {product.description || "Un délice à découvrir"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-orange-600 font-black text-lg">
                    {product.price.toLocaleString()} <span className="text-xs font-bold uppercase">FCFA</span>
                  </span>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-orange-100 hover:bg-orange-500 text-orange-600 hover:text-white p-2 rounded-xl transition-all"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Cart Bar */}
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
              onClick={() => (document.getElementById('cart-modal') as any)?.showModal()}
              className="bg-white text-slate-900 font-bold px-6 py-3 rounded-2xl flex items-center group active:scale-95 transition-all"
            >
              Voir Panier
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Cart Modal (native <dialog>) */}
      <dialog id="cart-modal" className="modal p-0 rounded-3xl shadow-2xl max-w-md w-full backdrop:bg-black/50">
        <div className="bg-white flex flex-col h-[80vh]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">Votre Panier</h2>
            <button
              onClick={() => (document.getElementById('cart-modal') as any)?.close()}
              className="text-slate-400 hover:text-slate-600"
            >
              <Plus className="w-8 h-8 rotate-45" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden mr-4">
                    {item.product.image ? (
                      <img src={item.product.image} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Utensils className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{item.product.name}</h4>
                    <p className="text-orange-600 font-bold">
                      {item.product.price.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
                <div className="flex items-center bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-600 hover:text-orange-600"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-8 text-center font-bold text-slate-900">{item.quantity}</span>
                  <button
                    onClick={() => addToCart(item.product)}
                    className="p-1 text-slate-600 hover:text-orange-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-6">
              <span className="text-slate-500 font-bold uppercase tracking-widest">Sous-total</span>
              <span className="text-2xl font-black text-slate-900">{cartTotal.toLocaleString()} FCFA</span>
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full bg-orange-500 disabled:bg-slate-300 text-white font-black py-5 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShoppingCart className="w-6 h-6 mr-2" />
                  CONFIRMER LA COMMANDE
                </>
              )}
            </button>
          </div>
        </div>
      </dialog>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        dialog::backdrop {
          backdrop-filter: blur(4px);
        }
        dialog[open] {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
