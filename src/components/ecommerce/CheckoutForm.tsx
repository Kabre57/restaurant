"use client";

import React, { useState, useEffect } from "react";
import { useEcommerceCart } from "@/store/useEcommerceCart";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { MapPin, ShoppingBag, Phone, User, Mail, CreditCard, Sparkles, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  assertEcommerceOrderAllowed,
  getDefaultDeliveryType,
  isClosedForOnlineOrders,
  type EcommerceDeliveryType,
  type EcommerceSettings,
} from "@/lib/ecommerce-settings";

type SettingsResponse = {
  settings?: EcommerceSettings;
  error?: string;
};

type CheckoutResponse = {
  error?: string;
  order?: {
    id: string;
  };
  payment?: {
    clientSecret?: string;
    paymentUrl?: string;
  };
};

export function CheckoutForm() {
  const { items, storeId, getTotal, clearCart } = useEcommerceCart();
  const router = useRouter();

  // Form states
  const [deliveryType, setDeliveryType] = useState<EcommerceDeliveryType>("CLICK_AND_COLLECT");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "ORANGE_MONEY" | "MTN_MONEY">("CARD");

  // UI States
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<EcommerceSettings | null>(null);

  useEffect(() => {
    if (!storeId) {
      setSettings(null);
      setSettingsLoading(false);
      return;
    }

    let isCancelled = false;

    async function fetchSettings() {
      setSettingsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/public/ecommerce-settings?storeId=${encodeURIComponent(storeId as string)}`);
        const data = (await response.json()) as SettingsResponse;

        if (!response.ok || !data.settings) {
          throw new Error(data.error || "Impossible de charger les paramètres e-commerce");
        }

        if (isCancelled) {
          return;
        }

        setSettings(data.settings);
        const defaultDeliveryType = getDefaultDeliveryType(data.settings);
        if (defaultDeliveryType) {
          setDeliveryType(defaultDeliveryType);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setSettings(null);
          setError(err instanceof Error ? err.message : "Impossible de charger les paramètres e-commerce");
        }
      } finally {
        if (!isCancelled) {
          setSettingsLoading(false);
        }
      }
    }

    void fetchSettings();

    return () => {
      isCancelled = true;
    };
  }, [storeId]);

  const itemsTotal = getTotal();
  const hasOrderMode = Boolean(settings?.clickAndCollectEnabled || settings?.deliveryEnabled);
  const isStoreClosed = !settings?.ecommerceEnabled || !hasOrderMode || (settings ? isClosedForOnlineOrders(settings) : false);
  const canClickAndCollect = Boolean(settings?.ecommerceEnabled && !isStoreClosed && settings.clickAndCollectEnabled);
  const canDeliver = Boolean(settings?.ecommerceEnabled && !isStoreClosed && settings.deliveryEnabled);
  const deliveryFee = deliveryType === "DELIVERY" && canDeliver ? settings?.deliveryFee ?? 0 : 0;
  const grandTotal = itemsTotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setError("Sélectionnez un restaurant depuis le menu avant de payer");
      return;
    }
    if (settingsLoading) {
      setError("Chargement des paramètres e-commerce en cours");
      return;
    }
    if (!settings) {
      setError("Impossible de vérifier la configuration de la boutique");
      return;
    }
    try {
      assertEcommerceOrderAllowed(settings, deliveryType);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Mode de commande indisponible");
      return;
    }
    if (items.length === 0) {
      setError("Votre panier est vide");
      return;
    }
    if (!customerName || !customerPhone) {
      setError("Le nom et le numéro de téléphone sont obligatoires");
      return;
    }
    if (deliveryType === "DELIVERY" && !deliveryAddress) {
      setError("L'adresse de livraison est obligatoire");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          deliveryType,
          deliveryAddress: deliveryType === "DELIVERY" ? deliveryAddress : null,
          customerNotes: customerNotes || null,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes || null,
          })),
        }),
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de la commande");
      }

      if (!data.order?.id || !data.payment) {
        throw new Error("Réponse de paiement invalide");
      }

      // Vider le panier après succès
      clearCart();

      // Redirection selon le moyen de paiement
      if (paymentMethod === "CARD") {
        // Stripe: Redirection vers notre page de confirmation qui gère le paiement Stripe (mocké/réel)
        router.push(`/order/confirmation/${data.order.id}?client_secret=${data.payment.clientSecret ?? ""}`);
      } else {
        // Mobile Money: Redirection vers le portail de paiement CinetPay (ou notre mock)
        if (!data.payment.paymentUrl) {
          throw new Error("Lien de paiement Mobile Money indisponible");
        }
        router.push(data.payment.paymentUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de traiter la commande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Formulaire de gauche */}
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Informations de Livraison
            </h2>

            {/* Mode de retrait */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setDeliveryType("CLICK_AND_COLLECT")}
                disabled={!canClickAndCollect}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                  deliveryType === "CLICK_AND_COLLECT"
                    ? "border-orange-500 bg-orange-50/35 text-orange-700 font-bold"
                    : "border-gray-200 bg-white text-gray-500"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <ShoppingBag className="h-5 w-5 mb-1.5" />
                <span className="text-sm">Retrait sur place</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType("DELIVERY")}
                disabled={!canDeliver}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                  deliveryType === "DELIVERY"
                    ? "border-orange-500 bg-orange-50/35 text-orange-700 font-bold"
                    : "border-gray-200 bg-white text-gray-500"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <MapPin className="h-5 w-5 mb-1.5" />
                <span className="text-sm">Livraison à domicile</span>
              </button>
            </div>

            {settings && !settingsLoading && isStoreClosed && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Boutique fermée temporairement
              </div>
            )}

            {/* Champs client */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+225 0700000000"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Adresse E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="jean.dupont@gmail.com"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {deliveryType === "DELIVERY" && (
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Adresse de livraison</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Rue des Jardins, Abidjan Cocody"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {settings && !isStoreClosed && (
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Délai minimal de préparation : {settings.preparationDelayMinutes} min
                </p>
              )}

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">Notes complémentaires (facultatif)</label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Code de portail, indications particulières..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              Paiement Sécurisé
            </h2>

            <PaymentMethodSelector selected={paymentMethod} onChange={setPaymentMethod} />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}
        </form>

        {/* Panier / Résumé de commande de droite */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-md space-y-6">
            <h3 className="text-lg font-bold text-gray-800 pb-3 border-b border-gray-100">
              Résumé de la commande
            </h3>

            {/* Articles */}
            <div className="max-h-[240px] overflow-y-auto space-y-4">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Votre panier est vide</p>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-600">x{item.quantity}</span>
                      <span className="text-gray-700 font-medium">{item.name}</span>
                    </div>
                    <span className="text-gray-800 font-bold">
                      {(item.price * item.quantity).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Totaux */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Sous-total</span>
                <span>{itemsTotal.toLocaleString("fr-FR")} FCFA</span>
              </div>
              {deliveryType === "DELIVERY" && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Frais de livraison</span>
                  <span>{deliveryFee.toLocaleString("fr-FR")} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-100 pt-3">
                <span>Total</span>
                <span className="text-orange-600">{grandTotal.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || settingsLoading || items.length === 0 || isStoreClosed}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 font-bold text-white shadow-md shadow-orange-500/10 transition-all duration-300 hover:from-orange-600 hover:to-amber-600 hover:shadow-lg hover:shadow-orange-600/20 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
            >
              {loading || settingsLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  {settingsLoading ? "Vérification..." : "Traitement en cours..."}
                </>
              ) : (
                <>
                  Confirmer et payer {grandTotal.toLocaleString("fr-FR")} FCFA
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
