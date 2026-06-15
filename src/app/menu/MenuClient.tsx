"use client";

import React, { useState, useEffect } from "react";
import { ProductCard } from "@/components/ecommerce/ProductCard";
import { CartDrawer } from "@/components/ecommerce/CartDrawer";
import { useEcommerceCart } from "@/store/useEcommerceCart";
import { Search, ShoppingCart, Utensils, Store, Loader2, Sparkles, MapPin } from "lucide-react";
import type { EcommerceSettings } from "@/lib/ecommerce-settings";

type StoreData = {
  id: string;
  name: string;
  address: string | null;
  ecommerceSettings: EcommerceSettings;
};

type CategoryData = {
  id: string;
  name: string;
  storeId: string;
};

type ProductData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
};

type MenuClientProps = {
  initialStores: StoreData[];
  initialCategories: CategoryData[];
};

export function MenuClient({ initialStores, initialCategories }: MenuClientProps) {
  const { storeId, setStoreId, items, clearCart } = useEcommerceCart();
  
  // State
  const [selectedStoreId, setSelectedStoreIdState] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const selectedStore = initialStores.find((store) => store.id === selectedStoreId) ?? null;
  const storeSettings = selectedStore?.ecommerceSettings;
  const isClosedToday = storeSettings?.closedDates.includes(today) ?? false;
  const canOrderOnline = Boolean(
    storeSettings?.ecommerceEnabled &&
      !isClosedToday &&
      (storeSettings.clickAndCollectEnabled || storeSettings.deliveryEnabled)
  );
  const categories = initialCategories.filter((category) => category.storeId === selectedStoreId);

  // Sync Zustand storeId with local state
  useEffect(() => {
    if (storeId && initialStores.some((store) => store.id === storeId)) {
      setSelectedStoreIdState(storeId);
    } else if (initialStores.length > 0) {
      const defaultId = initialStores[0].id;
      setSelectedStoreIdState(defaultId);
      setStoreId(defaultId);
    }
  }, [storeId, initialStores, setStoreId]);

  // Handle store change
  const handleStoreChange = (id: string) => {
    if (id !== selectedStoreId) {
      clearCart();
    }
    setSelectedStoreIdState(id);
    setStoreId(id);
    setSelectedCategoryId("");
  };

  // Fetch products
  useEffect(() => {
    if (!selectedStoreId) return;

    if (!canOrderOnline) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        let url = `/api/public/products?storeId=${selectedStoreId}`;
        if (selectedCategoryId) {
          url += `&categoryId=${selectedCategoryId}`;
        }
        if (searchQuery) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        const res = await fetch(url);
        const data = (await res.json()) as { products?: ProductData[] };
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchProducts, searchQuery ? 300 : 0);
    return () => clearTimeout(delayDebounce);
  }, [selectedStoreId, selectedCategoryId, searchQuery, canOrderOnline]);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="relative min-h-screen pb-20">
      {/* Banner de bienvenue stylisé */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white py-12 px-4 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/5 rounded-full blur-3xl -translate-x-40 translate-y-40 pointer-events-none" />
        
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Commande en ligne
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Parabellum Gourmet POS
            </h1>
            <p className="mt-2 text-orange-50/90 text-sm md:text-base max-w-xl">
              Commandez de succulents plats fraîchement préparés selon les modes proposés par le restaurant.
            </p>
          </div>

          {/* Sélecteur d'établissement */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col gap-2 min-w-[280px]">
            <label className="text-xs font-bold uppercase tracking-wider text-orange-100 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Choisissez votre restaurant
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="bg-white text-gray-800 rounded-xl px-3 py-2.5 text-sm font-semibold border-none focus:ring-2 focus:ring-orange-500 outline-none w-full"
            >
              {initialStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {selectedStoreId && (
              <span className="text-xs text-orange-100/80 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {selectedStore?.address || "Adresse non disponible"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Barre de recherche et Catégories */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:outline-none shadow-sm transition-colors"
            />
          </div>

          {/* Bouton de panier flottant / barre supérieure */}
          <button
            onClick={() => setIsCartOpen(true)}
            disabled={!canOrderOnline}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-orange-200 rounded-xl px-5 py-3 text-sm font-bold text-gray-800 shadow-sm transition-all hover:bg-orange-50/30 group active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-4.5 w-4.5 text-orange-500 group-hover:scale-110 transition-transform" />
            Panier
            {totalItemsCount > 0 && (
              <span className="bg-orange-500 text-white rounded-full text-xs px-2 py-0.5 animate-bounce">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>

        {/* Catégories Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-8">
          <button
            onClick={() => setSelectedCategoryId("")}
            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategoryId === ""
                ? "bg-gray-800 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Tout le Menu
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategoryId === category.id
                  ? "bg-gray-800 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Produits Grid */}
        {!selectedStore ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm max-w-md mx-auto">
            <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-800">Aucun restaurant disponible</h3>
          </div>
        ) : !canOrderOnline ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm max-w-md mx-auto">
            <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-800">Boutique fermée temporairement</h3>
            <p className="text-sm text-gray-500 mt-1">
              Les commandes en ligne ne sont pas disponibles pour cet établissement.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-2" />
            <span className="text-sm font-semibold">Chargement des plats...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm max-w-md mx-auto">
            <Utensils className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-base font-bold text-gray-800">Aucun produit disponible</h3>
            <p className="text-sm text-gray-500 mt-1">
              Nous n'avons pas trouvé de plats correspondants à vos filtres pour cet établissement.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
