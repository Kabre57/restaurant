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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-white shadow-2xl transition-all duration-300">
          <div className="flex h-full flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-800">Votre Panier</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-orange-50 p-6 text-orange-400">
                    <ShoppingCart className="h-12 w-12" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-gray-800">Votre panier est vide</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Parcourez notre menu et ajoutez vos plats favoris.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between border-b border-gray-50 pb-4"
                  >
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 rounded-lg object-cover bg-gray-50"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-orange-50 text-orange-500 font-bold text-xs">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                        <p className="text-xs text-orange-600 font-semibold mt-0.5">
                          {item.price.toLocaleString("fr-FR")} FCFA
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) removeItem(item.productId);
                            else updateQuantity(item.productId, item.quantity - 1);
                          }}
                          className="text-gray-500 hover:text-orange-600 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold text-gray-800 w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="text-gray-500 hover:text-orange-600 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Checkout CTA */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                <div className="flex items-center justify-between font-bold text-gray-800 text-base mb-6">
                  <span>Sous-total</span>
                  <span className="text-orange-600">{getTotal().toLocaleString("fr-FR")} FCFA</span>
                </div>

                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-bold text-white shadow-md shadow-orange-500/10 transition-all duration-300 hover:from-orange-600 hover:to-amber-600 hover:shadow-lg hover:shadow-orange-600/20 active:scale-[0.98]"
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
