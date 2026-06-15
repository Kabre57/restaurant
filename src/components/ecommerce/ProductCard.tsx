"use client";

import React from "react";
import { ShoppingBag, Plus, Minus, Flame } from "lucide-react";
import { useEcommerceCart } from "@/store/useEcommerceCart";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, items, updateQuantity, removeItem } = useEcommerceCart();
  
  const cartItem = items.find((i) => i.productId === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
    });
  };

  const handleIncrement = () => {
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity === 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, quantity - 1);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Aspect Ratio Container for Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-50">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-orange-500">
            <Flame className="h-10 w-10 animate-pulse" />
            <span className="mt-2 text-xs font-medium uppercase tracking-wider text-orange-600/70">
              Délicieux & Frais
            </span>
          </div>
        )}
        
        {/* Price Tag Overlay */}
        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3.5 py-1 text-sm font-bold text-gray-800 shadow-sm backdrop-blur-sm">
          {product.price.toLocaleString("fr-FR")} FCFA
        </div>
      </div>

      {/* Product Information */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800 group-hover:text-orange-600 transition-colors duration-200">
          {product.name}
        </h3>
        
        <p className="mt-2 text-sm text-gray-500 line-clamp-2 min-h-[40px]">
          {product.description || "Une préparation savoureuse faite maison avec des ingrédients frais."}
        </p>

        {/* Add to Cart Actions */}
        <div className="mt-5 flex items-center justify-between">
          {quantity > 0 ? (
            <div className="flex w-full items-center justify-between rounded-xl border border-orange-200 bg-orange-50/50 p-1.5 shadow-sm">
              <button
                onClick={handleDecrement}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm transition-all hover:bg-orange-100 active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <span className="font-bold text-orange-700">{quantity}</span>
              
              <button
                onClick={handleIncrement}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm transition-all hover:bg-orange-100 active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 font-semibold text-white shadow-md shadow-orange-500/10 transition-all duration-300 hover:from-orange-600 hover:to-amber-600 hover:shadow-lg hover:shadow-orange-600/20 active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4" />
              Ajouter au panier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
