'use client';

import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, Utensils, X, Phone, CreditCard, Smartphone } from 'lucide-react';
import { Product } from '@prisma/client';
import Image from 'next/image';

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: {
    supplements: string[];
    removals: string[];
    instructions: string;
    priceAdjustment: number;
  };
}

interface CustomerCartModalProps {
  cart: CartItem[];
  cartTotal: number;
  isSubmitting: boolean;
  onRemoveFromCart: (itemKey: string) => void;
  onAddToCart: (item: CartItem) => void;
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

export const getItemKey = (item: CartItem): string => {
  return `${item.product.id}-${JSON.stringify(item.customization?.supplements || [])}-${JSON.stringify(item.customization?.removals || [])}-${item.customization?.instructions || ''}`;
};

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
          <h2 className="text-sm font-black uppercase tracking-widest text-[#171717]">Votre Panier</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Liste des articles */}
          <div className="space-y-4">
            {cart.map((item) => {
              const itemKey = getItemKey(item);
              const singleItemTotal = item.product.price + (item.customization?.priceAdjustment || 0);

              return (
                <div key={itemKey} className="flex items-center justify-between bg-[#F8F9FA] p-4 rounded-2xl border border-[#E5E7EB]/50">
                  <div className="flex items-center flex-1 mr-2">
                    <div className="w-12 h-12 bg-white rounded-xl overflow-hidden mr-3 shrink-0 border border-slate-100 flex items-center justify-center">
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
                        <span className="text-2xl select-none">🍔</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-xs text-[#171717] truncate">{item.product.name}</h4>

                      {/* Render active customizations in light-orange style */}
                      {item.customization && (
                        <div className="mt-1 space-y-0.5">
                          {item.customization.supplements.map((supp, idx) => (
                            <span key={idx} className="block text-[9px] font-bold text-[#FF6D00]">+ {supp}</span>
                          ))}
                          {item.customization.removals.map((rem, idx) => (
                            <span key={idx} className="block text-[9px] font-bold text-red-500">- {rem}</span>
                          ))}
                          {item.customization.instructions && (
                            <span className="block text-[9px] font-semibold text-[#868e96] italic">"{item.customization.instructions}"</span>
                          )}
                        </div>
                      )}

                      <p className="text-[#FF6D00] font-black text-xs mt-1">
                        {singleItemTotal.toLocaleString()} F CFA
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center bg-white border border-[#E5E7EB] rounded-xl p-1 shrink-0">
                    <button onClick={() => onRemoveFromCart(itemKey)} className="p-1.5 text-slate-500 hover:text-[#FF6D00] transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                    <button onClick={() => onAddToCart(item)} className="p-1.5 text-slate-500 hover:text-[#FF6D00] transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <hr className="border-slate-100" />

          {/* Code Promo */}
          <div>
            <h3 className="text-[9px] font-black text-[#868e96] uppercase tracking-widest mb-3">Code Promotionnel</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: PROMO20"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 px-4 text-xs font-bold text-[#171717] outline-none focus:border-[#FF6D00] transition-colors"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Sélection du mode de paiement */}
          <div>
            <h3 className="text-[9px] font-black text-[#868e96] uppercase tracking-widest mb-3">Moyen de paiement</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setPaymentMethod('ESPECES')}
                className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${
                  paymentMethod === 'ESPECES' ? 'border-[#FF6D00] bg-[#FF6D00]/10 text-[#FF6D00]' : 'border-[#E5E7EB] bg-white text-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Comptoir
              </button>
              <button
                onClick={() => setPaymentMethod('MOBILE_MONEY')}
                className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${
                  paymentMethod === 'MOBILE_MONEY' ? 'border-[#FF6D00] bg-[#FF6D00]/10 text-[#FF6D00]' : 'border-[#E5E7EB] bg-white text-slate-600'
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
                  <label className="text-[9px] font-black text-[#868e96] uppercase tracking-widest mb-2 block">Choisir l&apos;opérateur</label>
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
                <label className="text-[9px] font-black text-[#868e96] uppercase tracking-widest mb-2 block">Numéro de téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Numéro (ex: 0102030405)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:border-[#FF6D00] outline-none"
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
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Sous-total</span>
          <span className="text-xl font-black text-slate-900">{cartTotal.toLocaleString()} F CFA</span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || cartTotal === 0}
          className="w-full bg-[#171717] disabled:bg-slate-300 disabled:shadow-none text-white font-black py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest"
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              CONFIRMER ({cartTotal.toLocaleString()} F CFA)
            </>
          )}
        </button>
      </div>
    </div>
    </div >
  );
}
