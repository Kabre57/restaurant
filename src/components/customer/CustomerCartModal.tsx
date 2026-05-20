'use client';

import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, Utensils, X, Phone, CreditCard, Smartphone } from 'lucide-react';
import { Product } from '@prisma/client';
import Image from 'next/image';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CustomerCartModalProps {
  cart: CartItem[];
  cartTotal: number;
  isSubmitting: boolean;
  onRemoveFromCart: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onSubmitOrder: (paymentData: { method: 'ESPECES' | 'MOBILE_MONEY'; provider?: string; phone?: string; promoCode?: string }) => void;
  isOpen: boolean;
  onClose: () => void;
}

const MOBILE_PROVIDERS = [
  { id: 'WAVE', name: 'Wave', color: 'bg-blue-500' },
  { id: 'ORANGE', name: 'Orange Money', color: 'bg-orange-500' },
  { id: 'MTN', name: 'MTN MoMo', color: 'bg-yellow-400' },
  { id: 'MOOV', name: 'Moov Money', color: 'bg-blue-600' },
  { id: 'TRESOR', name: 'Tresor Pay', color: 'bg-green-600' }
];

/**
 * CustomerCartModal - Affiche le panier et gère la sélection du moyen de paiement.
 */
export default function CustomerCartModal({
  cart,
  cartTotal,
  isSubmitting,
  onRemoveFromCart,
  onAddToCart,
  onSubmitOrder,
  isOpen,
  onClose
}: CustomerCartModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'ESPECES' | 'MOBILE_MONEY'>('ESPECES');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [promoCode, setPromoCode] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (paymentMethod === 'MOBILE_MONEY' && (!selectedProvider || phone.length < 8)) {
      alert("Veuillez sélectionner un opérateur et saisir un numéro valide.");
      return;
    }

    onSubmitOrder({
      method: paymentMethod,
      provider: paymentMethod === 'MOBILE_MONEY' ? selectedProvider! : undefined,
      phone: paymentMethod === 'MOBILE_MONEY' ? phone : undefined,
      promoCode: promoCode || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-black text-slate-900">Votre Panier</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Liste des articles */}
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                <div className="flex items-center flex-1 mr-2">
                  <div className="w-12 h-12 bg-white rounded-xl overflow-hidden mr-3 shrink-0 border border-slate-100">
                    {item.product.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Utensils className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{item.product.name}</h4>
                    <p className="text-brand-600 font-bold text-xs">{item.product.price.toLocaleString()} FCFA</p>
                  </div>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
                  <button onClick={() => onRemoveFromCart(item.product.id)} className="p-1.5 text-slate-500 hover:text-brand-600 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                  <button onClick={() => onAddToCart(item.product)} className="p-1.5 text-slate-500 hover:text-brand-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-slate-100" />

          {/* Code Promo */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Code Promotionnel</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: PROMO20" 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold placeholder:font-normal focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Sélection du mode de paiement */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Moyen de paiement</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setPaymentMethod('ESPECES')}
                className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  paymentMethod === 'ESPECES' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Comptoir
              </button>
              <button
                onClick={() => setPaymentMethod('MOBILE_MONEY')}
                className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  paymentMethod === 'MOBILE_MONEY' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Mobile
              </button>
            </div>

            {/* Formulaire Mobile Money */}
            {paymentMethod === 'MOBILE_MONEY' && (
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Choisir l&apos;opérateur</label>
                  <div className="flex flex-wrap gap-2">
                    {MOBILE_PROVIDERS.map(provider => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                          selectedProvider === provider.id 
                            ? `${provider.color} text-white border-transparent shadow-md` 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {provider.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {selectedProvider && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Numéro de téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="Numéro (ex: 0102030405)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Un message sera envoyé sur ce numéro pour valider le paiement.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sous-total</span>
            <span className="text-xl font-black text-slate-900">{cartTotal.toLocaleString()} FCFA</span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || cartTotal === 0}
            className="w-full bg-brand-500 disabled:bg-slate-300 disabled:shadow-none text-white font-black py-4 rounded-xl shadow-lg shadow-brand-500/30 active:scale-[0.98] transition-all flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                CONFIRMER ({cartTotal.toLocaleString()} FCFA)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
