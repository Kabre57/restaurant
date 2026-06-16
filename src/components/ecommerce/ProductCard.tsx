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
    <div className="group relative overflow-hidden rounded-[1.25rem] border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(18,18,18,0.08)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#fff7ef]">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-[var(--parabellum-muted)]">
            <Flame className="h-10 w-10 text-[var(--parabellum-primary)]" />
            <span className="mt-2 text-xs font-semibold uppercase tracking-wide">
              Délicieux et frais
            </span>
          </div>
        )}

        <div className="absolute right-3 top-3 rounded-full border border-[rgba(235,20,0,0.2)] bg-[rgba(255,255,255,0.92)] px-3 py-1 text-xs font-bold text-[var(--parabellum-primary)] shadow-sm">
          {product.price.toLocaleString("fr-FR")} FCFA
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold uppercase tracking-tight text-[var(--parabellum-text)]" style={{ fontFamily: 'var(--title-font)' }}>
          {product.name}
        </h3>

        <p className="mt-2 min-h-[40px] text-sm leading-6 text-[var(--parabellum-muted)]">
          {product.description || "Une préparation savoureuse faite maison avec des ingrédients frais."}
        </p>

        <div className="mt-4 flex items-center justify-between">
          {quantity > 0 ? (
            <div className="flex w-full items-center justify-between rounded-full border border-[var(--parabellum-border)] bg-[#fffaf5] p-1.5">
              <button
                onClick={handleDecrement}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-primary)] transition-colors hover:bg-[#fff6ef]"
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <span className="text-sm font-bold text-[var(--parabellum-text)]">{quantity}</span>
              
              <button
                onClick={handleIncrement}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-primary)] transition-colors hover:bg-[#fff6ef]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="th-btn w-full justify-center"
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
