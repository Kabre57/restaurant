"use client";

import React, { useState, useEffect } from "react";
import { useEcommerceCart } from "@/store/useEcommerceCart";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { MapPin, ShoppingBag, Phone, User, Mail, CreditCard, Loader } from "lucide-react";
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

  const submitCheckout = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
    <div className="barab-page mx-auto max-w-7xl px-4 py-8 lg:py-10">
      <div className="title-area mb-8">
        <span className="sub-title">Commande en ligne</span>
        <h1 className="sec-title">Checkout sécurisé</h1>
        <p className="desc">
          Le panier, les modes de retrait et les frais sont affichés à partir de la configuration serveur du restaurant.
        </p>
      </div>

      <div className="barab-page-grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <form onSubmit={submitCheckout} className="space-y-6">
          <section className="barab-card rounded-[1.25rem] p-5">
            <div className="mb-5 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[var(--parabellum-primary)]" />
              <h2 className="text-base font-bold uppercase tracking-wide text-[var(--parabellum-text)]">
                Informations de commande
              </h2>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeliveryType("CLICK_AND_COLLECT")}
                disabled={!canClickAndCollect}
                className={`flex flex-col items-center justify-center rounded-[1rem] border p-4 text-center transition-all ${
                  deliveryType === "CLICK_AND_COLLECT"
                    ? "border-[rgba(235,20,0,0.28)] bg-[rgba(235,20,0,0.06)] text-[var(--parabellum-primary)] shadow-[0_14px_28px_rgba(18,18,18,0.08)]"
                    : "border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-text)] hover:-translate-y-0.5 hover:bg-[#fffaf5]"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <ShoppingBag className="mb-2 h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Click & collect</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType("DELIVERY")}
                disabled={!canDeliver}
                className={`flex flex-col items-center justify-center rounded-[1rem] border p-4 text-center transition-all ${
                  deliveryType === "DELIVERY"
                    ? "border-[rgba(235,20,0,0.28)] bg-[rgba(235,20,0,0.06)] text-[var(--parabellum-primary)] shadow-[0_14px_28px_rgba(18,18,18,0.08)]"
                    : "border-[var(--parabellum-border)] bg-[var(--parabellum-card)] text-[var(--parabellum-text)] hover:-translate-y-0.5 hover:bg-[#fffaf5]"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <MapPin className="mb-2 h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Livraison à domicile</span>
              </button>
            </div>

            {settings && !settingsLoading && isStoreClosed && (
              <div className="mb-5 rounded-[1rem] border border-[rgba(235,20,0,0.18)] bg-[rgba(235,20,0,0.08)] p-4 text-sm text-[var(--parabellum-danger)]">
                Boutique fermée temporairement
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--parabellum-text)]">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-[var(--parabellum-muted)]" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="th-input h-11 pl-10 pr-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--parabellum-text)]">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-[var(--parabellum-muted)]" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+225 0700000000"
                      className="th-input h-11 pl-10 pr-4"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--parabellum-text)]">Adresse e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-[var(--parabellum-muted)]" />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="jean.dupont@gmail.com"
                      className="th-input h-11 pl-10 pr-4"
                    />
                  </div>
                </div>
              </div>

              {deliveryType === "DELIVERY" && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--parabellum-text)]">Adresse de livraison</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-[var(--parabellum-muted)]" />
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Rue des Jardins, Abidjan Cocody"
                      className="th-input h-11 pl-10 pr-4"
                    />
                  </div>
                </div>
              )}

              {settings && !isStoreClosed && (
                <div className="th-badge th-badge--muted">
                  Délai minimal de préparation: {settings.preparationDelayMinutes} min
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--parabellum-text)]">
                  Notes complémentaires (facultatif)
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Code de portail, indications particulières..."
                  rows={3}
                  className="th-textarea px-4 py-3 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="barab-card rounded-[1.25rem] p-5">
            <div className="mb-5 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[var(--parabellum-primary)]" />
              <h2 className="text-base font-bold uppercase tracking-wide text-[var(--parabellum-text)]">
                Paiement sécurisé
              </h2>
            </div>

            <PaymentMethodSelector selected={paymentMethod} onChange={setPaymentMethod} />
          </section>

          {error && (
            <div className="rounded-[1rem] border border-[rgba(235,20,0,0.2)] bg-[rgba(235,20,0,0.08)] p-4 text-sm text-[var(--parabellum-danger)]">
              {error}
            </div>
          )}
        </form>

        <aside className="lg:sticky lg:top-6">
          <div className="barab-card space-y-6 rounded-[1.25rem] p-5">
            <div className="border-b border-[var(--parabellum-border)] pb-3">
              <h3 className="text-base font-bold uppercase tracking-wide text-[var(--parabellum-text)]">
                Résumé de la commande
              </h3>
            </div>

            <div className="max-h-[240px] space-y-4 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--parabellum-muted)]">Votre panier est vide</p>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--parabellum-text)]">
                        <span className="mr-2 text-[var(--parabellum-primary)]">x{item.quantity}</span>
                        {item.name}
                      </div>
                    </div>
                    <span className="whitespace-nowrap font-semibold text-[var(--parabellum-text)]">
                      {(item.price * item.quantity).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 border-t border-[var(--parabellum-border)] pt-4">
              <div className="flex justify-between text-sm text-[var(--parabellum-muted)]">
                <span>Sous-total</span>
                <span>{itemsTotal.toLocaleString("fr-FR")} FCFA</span>
              </div>
              {deliveryType === "DELIVERY" && (
                <div className="flex justify-between text-sm text-[var(--parabellum-muted)]">
                  <span>Frais de livraison</span>
                  <span>{deliveryFee.toLocaleString("fr-FR")} FCFA</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--parabellum-border)] pt-3 text-base font-semibold text-[var(--parabellum-text)]">
                <span>Total</span>
                <span className="text-[var(--parabellum-primary)]">{grandTotal.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void submitCheckout();
              }}
              disabled={loading || settingsLoading || items.length === 0 || isStoreClosed}
              className="th-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || settingsLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  {settingsLoading ? "Vérification..." : "Traitement en cours..."}
                </>
              ) : (
                <>Confirmer et payer {grandTotal.toLocaleString("fr-FR")} FCFA</>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
