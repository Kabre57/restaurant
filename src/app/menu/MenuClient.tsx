"use client";

import React, { useState, useEffect } from "react";
import { ProductCard } from "@/components/ecommerce/ProductCard";
import { CartDrawer } from "@/components/ecommerce/CartDrawer";
import { useEcommerceCart } from "@/store/useEcommerceCart";
import { Search, ShoppingCart, Utensils, Store, Loader2, MapPin } from "lucide-react";
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
    <div className="barab-page min-h-screen pb-20">
      <header className="breadcumb-wrapper">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="title-area max-w-3xl">
            <span className="sub-title">Commande en ligne</span>
            <h1 className="sec-title text-white">Menu public</h1>
            <p className="desc text-white/78">
              Les disponibilités, les modes de commande et les frais sont pilotés par la configuration du restaurant.
            </p>
          </div>

          <div className="barab-card w-full max-w-md rounded-[1.25rem] p-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--parabellum-muted)]">
              <Store className="h-3.5 w-3.5" />
              Choisissez votre restaurant
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="th-select h-11 px-3 text-sm"
            >
              {initialStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {selectedStoreId && (
              <span className="mt-3 flex items-center gap-1 text-xs text-[var(--parabellum-muted)]">
                <MapPin className="h-3.5 w-3.5" />
                {selectedStore?.address || "Adresse non disponible"}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--parabellum-muted)]" />
            <input
              type="text"
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="th-input h-11 w-full pl-10 pr-4"
            />
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            disabled={!canOrderOnline}
            className="th-btn th-btn--secondary inline-flex h-11 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-4.5 w-4.5 text-[var(--parabellum-primary)]" />
            Panier
            {totalItemsCount > 0 && (
              <span className="rounded-full bg-[var(--parabellum-primary)] px-2 py-0.5 text-xs text-white">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategoryId("")}
            className={`th-badge whitespace-nowrap transition-all ${
              selectedCategoryId === ""
                ? "th-badge--primary"
                : "th-badge--muted hover:bg-[#fffaf5]"
            }`}
          >
            Tout le Menu
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`th-badge whitespace-nowrap transition-all ${
                selectedCategoryId === category.id
                  ? "th-badge--primary"
                  : "th-badge--muted hover:bg-[#fffaf5]"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {!selectedStore ? (
          <div className="barab-empty mx-auto max-w-md rounded-[1.25rem] p-8 text-center">
            <Store className="mx-auto mb-4 h-12 w-12 text-[var(--parabellum-primary)]" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-[var(--parabellum-text)]">Aucun restaurant disponible</h3>
          </div>
        ) : !canOrderOnline ? (
          <div className="barab-empty mx-auto max-w-md rounded-[1.25rem] p-8 text-center">
            <Store className="mx-auto mb-4 h-12 w-12 text-[var(--parabellum-primary)]" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-[var(--parabellum-text)]">Boutique fermée temporairement</h3>
            <p className="mt-1 text-sm text-[var(--parabellum-muted)]">
              Les commandes en ligne ne sont pas disponibles pour cet établissement.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--parabellum-muted)]">
            <Loader2 className="mb-2 h-10 w-10 animate-spin text-[var(--parabellum-primary)]" />
            <span className="text-sm font-semibold uppercase tracking-wide">Chargement des plats...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="barab-empty mx-auto max-w-md rounded-[1.25rem] p-8 text-center">
            <Utensils className="mx-auto mb-4 h-12 w-12 text-[var(--parabellum-primary)]" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-[var(--parabellum-text)]">Aucun produit disponible</h3>
            <p className="mt-1 text-sm text-[var(--parabellum-muted)]">
              Nous n'avons pas trouvé de plats correspondants à vos filtres pour cet établissement.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
