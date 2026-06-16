"use client";

import React from "react";
import { X, Trash2, Plus, Minus, ShoppingCart, ArrowRight } from "lucide-react";
import { useEcommerceCart } from "@/store/useEcommerceCart";
import Link from "next/link";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, getTotal } = useEcommerceCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="barab-card w-screen max-w-md transition-all duration-300">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[var(--parabellum-border)] p-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[var(--parabellum-primary)]" />
                <h2 className="text-lg font-bold uppercase tracking-tight text-[var(--parabellum-text)]" style={{ fontFamily: 'var(--title-font)' }}>Votre panier</h2>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-muted)] transition-colors hover:bg-[#fff6ef] hover:text-[var(--parabellum-text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="rounded-[1.25rem] border border-[var(--parabellum-border)] bg-[#fffaf5] p-5 text-[var(--parabellum-muted)]">
                    <ShoppingCart className="h-12 w-12 text-[var(--parabellum-primary)]" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold uppercase tracking-tight text-[var(--parabellum-text)]" style={{ fontFamily: 'var(--title-font)' }}>Votre panier est vide</h3>
                  <p className="mt-1 text-sm text-[var(--parabellum-muted)]">
                    Parcourez notre menu et ajoutez vos plats favoris.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-4 border-b border-[var(--parabellum-border)] pb-4"
                  >
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 rounded-[0.85rem] object-cover bg-[#fffaf5]"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-[0.85rem] border border-[var(--parabellum-border)] bg-[#fffaf5] text-xs font-bold text-[var(--parabellum-primary)]">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--parabellum-text)]">{item.name}</h4>
                        <p className="mt-0.5 text-xs font-semibold text-[var(--parabellum-primary)]">
                          {item.price.toLocaleString("fr-FR")} FCFA
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2.5 rounded-full border border-[var(--parabellum-border)] bg-[#fffaf5] px-2 py-1">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) removeItem(item.productId);
                            else updateQuantity(item.productId, item.quantity - 1);
                          }}
                          className="text-[var(--parabellum-muted)] transition-colors hover:text-[var(--parabellum-primary)]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-4 text-center text-xs font-medium text-[var(--parabellum-text)]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="text-[var(--parabellum-muted)] transition-colors hover:text-[var(--parabellum-primary)]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="rounded-full border border-[var(--parabellum-border)] p-2 text-[var(--parabellum-muted)] transition-colors hover:bg-[#fff5f3] hover:text-[var(--parabellum-danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[var(--parabellum-border)] bg-[#fffaf5] p-5">
                <div className="mb-5 flex items-center justify-between text-base font-semibold text-[var(--parabellum-text)]">
                  <span>Sous-total</span>
                  <span className="text-[var(--parabellum-primary)]">{getTotal().toLocaleString("fr-FR")} FCFA</span>
                </div>

                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="th-btn flex w-full items-center justify-center gap-2"
                >
                  Passer au paiement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
