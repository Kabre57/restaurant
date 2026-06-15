"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Clock, MapPin, ChefHat, ShoppingBag, ShieldCheck, CreditCard, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

type ConfirmationClientProps = {
  order: any;
  clientSecret?: string;
  isMockFromQuery?: boolean;
};

export function ConfirmationClient({ order: initialOrder, clientSecret, isMockFromQuery }: ConfirmationClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [paymentStatus, setPaymentStatus] = useState<string>(order.payments?.[0]?.status || "EN_ATTENTE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulaire de carte mock
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  const activePayment = order.payments?.[0];
  const transactionId = activePayment?.transactionId || "";

  // Rafraîchit les détails de la commande
  const handleRefresh = async () => {
    try {
      const res = await fetch(`/api/public/products`); // simple refresh trigger or we can fetch a specific order details endpoint
      // Fetch details of this order specifically
      const orderRes = await fetch(`/api/orders/details?id=${order.id}`);
      if (orderRes.ok) {
        const data = await orderRes.json();
        if (data.order) {
          setOrder(data.order);
          if (data.order.payments?.[0]?.status) {
            setPaymentStatus(data.order.payments[0].status);
          }
        }
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  // Met en place un polling toutes les 10 secondes pour suivre le statut de préparation
  useEffect(() => {
    const interval = setInterval(handleRefresh, 10000);
    return () => clearInterval(interval);
  }, []);

  // Déclenche la simulation de paiement Stripe Succeeded
  const handleSimulateStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Appel du webhook Stripe local
      const response = await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: transactionId,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Échec de la simulation du paiement.");
      }

      // Attendre un petit instant puis recharger les infos
      setTimeout(async () => {
        await handleRefresh();
        setLoading(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Erreur lors du traitement");
      setLoading(false);
    }
  };

  // Déclenche la simulation de paiement Mobile Money
  const handleSimulateMobilePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Appel du webhook CinetPay local
      const response = await fetch("/api/webhooks/mobile-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpm_trans_id: transactionId,
          status: "ACCEPTED",
        }),
      });

      if (!response.ok) {
        throw new Error("Échec de la simulation du paiement mobile.");
      }

      // Attendre un petit instant puis recharger les infos
      setTimeout(async () => {
        await handleRefresh();
        setLoading(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Erreur lors du traitement");
      setLoading(false);
    }
  };

  const getStepStatusClass = (step: number) => {
    // Statuts possibles de la commande: EN_ATTENTE, PREPARATION, PRET, COMPLETED, CANCELLED
    const status = order.status;
    
    if (status === "CANCELLED") return "border-red-300 text-red-500 bg-red-50";

    if (step === 1) {
      // Étape 1 : Commande reçue / payée
      return paymentStatus === "REUSSIE" 
        ? "border-emerald-500 text-emerald-600 bg-emerald-50"
        : "border-orange-500 text-orange-600 bg-orange-50 animate-pulse";
    }
    if (step === 2) {
      // Étape 2 : En préparation
      if (status === "PREPARATION") return "border-orange-500 text-orange-600 bg-orange-50 animate-pulse";
      if (status === "PRET" || status === "COMPLETED") return "border-emerald-500 text-emerald-600 bg-emerald-50";
      return "border-gray-200 text-gray-400 bg-white";
    }
    if (step === 3) {
      // Étape 3 : Prête / En livraison
      if (status === "PRET") return "border-orange-500 text-orange-600 bg-orange-50 animate-pulse";
      if (status === "COMPLETED") return "border-emerald-500 text-emerald-600 bg-emerald-50";
      return "border-gray-200 text-gray-400 bg-white";
    }
    if (step === 4) {
      // Étape 4 : Terminé
      if (status === "COMPLETED") return "border-emerald-500 text-emerald-600 bg-emerald-50";
      return "border-gray-200 text-gray-400 bg-white";
    }
    return "border-gray-200 text-gray-400 bg-white";
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {paymentStatus !== "REUSSIE" ? (
        /* ================== ÉCRAN DE PAIEMENT EN ATTENTE ================== */
        <div className="space-y-6">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-6 text-center shadow-sm">
            <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3 animate-bounce" />
            <h1 className="text-xl font-bold text-orange-800">Finalisez votre paiement</h1>
            <p className="mt-2 text-sm text-orange-700/80">
              Votre commande pour un total de <span className="font-bold">{order.total.toLocaleString("fr-FR")} FCFA</span> est enregistrée. Veuillez procéder au paiement pour démarrer la préparation.
            </p>
          </div>

          {order.payments?.[0]?.onlineMethod === "CARD" ? (
            /* Formulaire Stripe Carte de crédit fictif */
            <form onSubmit={handleSimulateStripePayment} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md space-y-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 pb-3 border-b border-gray-50">
                <CreditCard className="h-5 w-5 text-indigo-500" />
                Paiement par Carte Bancaire
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Nom du titulaire</label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="TITULAIRE DE LA CARTE"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Numéro de carte</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, "").replace(/(\d{4})/g, "$1 ").trim().substring(0, 19))}
                    placeholder="4242 4242 4242 4242"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Expiration</label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/AA"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">CVC / CVV</label>
                    <input
                      type="text"
                      required
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:bg-gray-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Traitement de la transaction...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Payer {order.total.toLocaleString("fr-FR")} FCFA (Simulation)
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Simulation Mobile Money */
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md text-center space-y-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2 pb-3 border-b border-gray-50">
                <ShieldCheck className="h-5 w-5 text-orange-500" />
                Paiement Mobile Money Initié
              </h2>

              <div className="space-y-2 max-w-sm mx-auto">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-gray-700">En attente de validation...</p>
                <p className="text-xs text-gray-400">
                  Un message de confirmation a été envoyé sur le téléphone portable renseigné. Si la page ne redirige pas automatiquement, utilisez le bouton ci-dessous pour simuler le succès.
                </p>
              </div>

              {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

              <button
                onClick={handleSimulateMobilePayment}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 py-3.5 font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:bg-gray-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  <>
                    Simuler le succès du paiement Mobile Money
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ================== ÉCRAN DE SUIVI DE COMMANDE CONFIRMÉE ================== */
        <div className="space-y-6">
          {/* Badge Succès */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 text-center shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h1 className="text-2xl font-black text-emerald-800">Commande Confirmée !</h1>
            <p className="mt-1.5 text-sm text-emerald-700/80">
              Merci pour votre confiance. Votre commande est actuellement en cours de traitement.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 bg-white/80 border border-gray-100 rounded-full px-4 py-1.5 w-fit mx-auto shadow-sm">
              <span>Réf : {order.id.slice(-8).toUpperCase()}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <span>{order.store?.name}</span>
            </div>
          </div>

          {/* Stepper de statut de préparation */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                <ChefHat className="h-4.5 w-4.5 text-orange-500" />
                Statut de préparation
              </h2>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualiser
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 relative">
              {/* Étape 1 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getStepStatusClass(1)}`}>
                  1
                </div>
                <span className="mt-2 text-xs font-bold text-gray-700">Reçue</span>
              </div>

              {/* Étape 2 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getStepStatusClass(2)}`}>
                  2
                </div>
                <span className="mt-2 text-xs font-bold text-gray-700">En cuisine</span>
              </div>

              {/* Étape 3 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getStepStatusClass(3)}`}>
                  3
                </div>
                <span className="mt-2 text-xs font-bold text-gray-700">
                  {order.deliveryType === "DELIVERY" ? "En livraison" : "Prête"}
                </span>
              </div>

              {/* Étape 4 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getStepStatusClass(4)}`}>
                  4
                </div>
                <span className="mt-2 text-xs font-bold text-gray-700">Livrée / Retirée</span>
              </div>
            </div>
          </div>

          {/* Détails de livraison/retrait et Adresse */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md space-y-4">
            <h3 className="text-base font-bold text-gray-800 pb-2 border-b border-gray-50 flex items-center gap-2">
              <MapPin className="h-4.5 w-4.5 text-orange-500" />
              Détails de Retrait / Livraison
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Destinataire</span>
                <p className="font-bold text-gray-800">{order.customerName}</p>
                <p className="text-gray-500">{order.customerPhone}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Mode de retrait</span>
                <p className="font-bold text-orange-600">
                  {order.deliveryType === "DELIVERY" ? "Livraison à domicile" : "Click & Collect (Retrait)"}
                </p>
                {order.deliveryType === "DELIVERY" ? (
                  <p className="text-gray-500 font-medium">{order.deliveryAddress}</p>
                ) : (
                  <p className="text-gray-500 font-medium">Adresse du restaurant : {order.store?.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Résumé de commande */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md space-y-4">
            <h3 className="text-base font-bold text-gray-800 pb-2 border-b border-gray-50 flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-orange-500" />
              Détails des articles
            </h3>

            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-600">x{item.quantity}</span>
                    <span className="text-gray-700 font-medium">{item.product?.name}</span>
                  </div>
                  <span className="text-gray-800 font-bold">
                    {(item.price * item.quantity).toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              ))}

              <div className="border-t border-gray-50 pt-3 flex justify-between items-center font-bold text-gray-800 text-base">
                <span>Total réglé</span>
                <span className="text-orange-600">{order.total.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
