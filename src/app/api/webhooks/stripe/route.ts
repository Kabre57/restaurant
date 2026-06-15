import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import Stripe from "stripe";

const stripeApiKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeApiKey ? new Stripe(stripeApiKey, { apiVersion: "2025-01-27-preview" as any }) : null;

/**
 * @openapi
 * /api/webhooks/stripe:
 *   post:
 *     summary: Webhook de notification de paiement Stripe
 *     tags: [Webhooks]
 *     description: Point d'entrée de callback appelé par Stripe pour notifier des événements de transaction (succès ou échec).
 *     responses:
 *       200:
 *         description: Événement reçu et traité avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *       400:
 *         description: Échec du traitement ou signature invalide.
 */
export async function POST(request: NextRequest) {
  let event: any;
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (webhookSecret && signature && stripe) {
      const rawBody = await request.text();
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // Pour les tests locaux et la validation, on lit directement le JSON
      event = await request.json();
      console.log("[Stripe Webhook Mock] Événement reçu directement (sans vérification de signature)");
    }

    const eventType = event.type;
    console.log(`[Stripe Webhook] Traitement de l'événement: ${eventType}`);

    if (eventType === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.id;
      
      console.log(`[Stripe Webhook] Paiement réussi pour la transaction: ${transactionId}`);
      await PaymentService.confirmPayment(transactionId);
    } else if (eventType === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.id;

      console.warn(`[Stripe Webhook] Paiement échoué pour la transaction: ${transactionId}`);
      await PaymentService.failPayment(transactionId);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook Error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 400 }
    );
  }
}
