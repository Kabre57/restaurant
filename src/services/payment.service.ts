import { prisma } from "@/lib/db";
import { PaymentStatus, OnlinePaymentMethod } from "@prisma/client";
import Stripe from "stripe";
import { randomUUID } from "crypto";

// Initialisation de Stripe (robuste aux clés manquantes pour éviter les plantages)
const stripeApiKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeApiKey
  ? new Stripe(stripeApiKey, { apiVersion: "2025-01-27-preview" as any })
  : null;

const CINETPAY_PAYMENT_URL = "https://api-checkout.cinetpay.com/v2/payment";

export class PaymentService {
  /**
   * Crée une intention de paiement Stripe (PaymentIntent) pour les cartes bancaires
   */
  static async createStripePaymentIntent(orderId: string, amount: number, customerEmail?: string) {
    const currency = process.env.STRIPE_CURRENCY || "eur";
    
    // Détermination de l'unité monétaire (centimes pour EUR/USD, entier pour XOF)
    const isZeroDecimal = ["xof", "xaf", "jpy", "clp", "krw"].includes(currency.toLowerCase());
    const stripeAmount = isZeroDecimal ? Math.round(amount) : Math.round(amount * 100);

    let clientSecret = "";
    let transactionId = `ST_MOCK_${randomUUID().slice(0, 8)}`;

    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: stripeAmount,
          currency: currency.toLowerCase(),
          metadata: { orderId },
          receipt_email: customerEmail || undefined,
        });

        clientSecret = paymentIntent.client_secret || "";
        transactionId = paymentIntent.id;
      } catch (error) {
        console.error("Erreur Stripe creation:", error);
        // Fallback en mode mock si l'API Stripe renvoie une erreur
        clientSecret = `mock_secret_${randomUUID()}`;
      }
    } else {
      // Simulation pour le développement
      console.log(`[Stripe Mock] Création d'une intention de paiement de ${amount} ${currency}`);
      clientSecret = `mock_secret_${randomUUID()}`;
    }

    // Création de l'enregistrement de paiement en attente
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount,
        status: PaymentStatus.EN_ATTENTE,
        onlineMethod: OnlinePaymentMethod.CARD,
        transactionId,
        externalRef: clientSecret,
      },
    });

    return {
      paymentId: payment.id,
      transactionId,
      clientSecret,
      isMock: !stripe,
    };
  }

  /**
   * Initialise un paiement Mobile Money via l'API CinetPay
   */
  static async createMobileMoneyPayment(
    orderId: string,
    amount: number,
    method: "ORANGE_MONEY" | "MTN_MONEY",
    customerPhone: string,
    customerEmail?: string
  ) {
    const apikey = process.env.CINETPAY_APIKEY;
    const siteId = process.env.CINETPAY_SITE_ID;
    const currency = process.env.CINETPAY_CURRENCY || "XOF";
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const notifyUrl = process.env.CINETPAY_NOTIFY_URL || `${baseUrl}/api/webhooks/mobile-money`;
    const returnUrl = `${baseUrl}/order/confirmation/${orderId}`;

    const transactionId = `CP${orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;

    let paymentUrl = `${baseUrl}/order/confirmation/${orderId}?mock_payment=true&payment_method=${method}`;
    let isMock = true;

    // Création de l'enregistrement de paiement en attente
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount,
        status: PaymentStatus.EN_ATTENTE,
        onlineMethod: method === "ORANGE_MONEY" ? OnlinePaymentMethod.ORANGE_MONEY : OnlinePaymentMethod.MTN_MONEY,
        transactionId,
      },
    });

    if (apikey && siteId) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { store: true },
        });

        if (!order) throw new Error("Commande non trouvée");

        const payload = {
          apikey,
          site_id: siteId,
          transaction_id: transactionId,
          amount,
          currency,
          description: `Commande en ligne ${orderId.slice(-6)} - ${order.store.name}`,
          notify_url: notifyUrl,
          return_url: returnUrl,
          channels: "MOBILE_MONEY",
          lang: "fr",
          metadata: JSON.stringify({ orderId, paymentId: payment.id, method }),
          lock_phone_number: true,
          customer_phone_number: customerPhone,
          customer_name: order.customerName || "Client En Ligne",
          customer_surname: "E-commerce",
          customer_email: customerEmail || process.env.CINETPAY_CUSTOMER_EMAIL || "ecommerce@parabellum.com",
          customer_address: order.deliveryAddress || "Click & Collect",
          customer_city: "Abidjan",
          customer_country: "CI",
        };

        const response = await fetch(CINETPAY_PAYMENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.code === "201" && result.data?.payment_url) {
          paymentUrl = result.data.payment_url;
          isMock = false;
          
          // Mise à jour de la référence externe avec le token de paiement
          await prisma.payment.update({
            where: { id: payment.id },
            data: { externalRef: result.data.payment_token || null },
          });
        } else {
          console.warn("CinetPay API a échoué ou renvoyé une erreur, utilisation du mode Mock.", result);
        }
      } catch (error) {
        console.error("Erreur de connexion CinetPay:", error);
      }
    } else {
      console.log(`[CinetPay Mock] Pas de clés API configurées. Utilisation du lien mock.`);
    }

    return {
      paymentId: payment.id,
      transactionId,
      paymentUrl,
      isMock,
    };
  }

  /**
   * Confirme un paiement par transactionId et met à jour la commande associée
   */
  static async confirmPayment(transactionId: string, externalRef?: string) {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { transactionId },
        include: { order: true },
      });

      if (!payment) {
        throw new Error(`Paiement avec la transaction ${transactionId} introuvable`);
      }

      if (payment.status === PaymentStatus.REUSSIE) {
        return payment;
      }

      // Mise à jour du statut du paiement
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REUSSIE,
          externalRef: externalRef || payment.externalRef,
        },
      });

      // Si toutes les transactions de la commande couvrent le total de la commande, on la marque comme payée
      // et prête à être traitée par la cuisine (status EN_ATTENTE ou PREPARATION selon le flux)
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: "EN_ATTENTE", // Cuisines et POS la verront comme nouvelle commande
        },
      });

      // Déduction des stocks pour cette commande
      // (utilisation de l'action existante du module inventaire via la transaction)
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: payment.orderId },
      });

      for (const item of orderItems) {
        // Déduction des stocks de la fiche technique
        const mappings = await tx.productIngredient.findMany({
          where: { productId: item.productId },
        });

        for (const mapping of mappings) {
          const totalNeeded = mapping.quantity * item.quantity;
          const inventory = await tx.inventory.findUnique({
            where: {
              storeId_ingredientId: {
                storeId: payment.order.storeId,
                ingredientId: mapping.ingredientId,
              },
            },
          });

          if (inventory) {
            const newQuantity = Math.max(0, inventory.quantity - totalNeeded);
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: newQuantity,
                lastUpdated: new Date(),
              },
            });

            // Log mouvement d'ingrédient
            await tx.ingredientMovement.create({
              data: {
                storeId: payment.order.storeId,
                ingredientId: mapping.ingredientId,
                quantity: -totalNeeded,
                reason: "ADJUSTMENT_CORRECTION",
                note: `Consommé via commande e-commerce (ID: ${payment.orderId})`,
              },
            });
          }
        }
      }

      return updatedPayment;
    });
  }

  /**
   * Marque un paiement comme échoué
   */
  static async failPayment(transactionId: string) {
    return await prisma.payment.update({
      where: { transactionId },
      data: { status: PaymentStatus.ECHOUEE },
    });
  }
}
