import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import crypto from "node:crypto";

function verifyCinetPaySignature(rawBody: string, signatureHeader: string | null, secret?: string) {
  if (!signatureHeader || !secret) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const signature = signatureHeader.trim();
  return [digest, `sha256=${digest}`].some((expected) => signature === expected);
}

/**
 * @openapi
 * /api/webhooks/mobile-money:
 *   post:
 *     summary: Webhook de notification de paiement Mobile Money
 *     tags: [Webhooks]
 *     description: Point d'entrée de callback appelé par l'agrégateur (ex. CinetPay) pour notifier du statut d'une transaction Mobile Money (Orange Money, MTN, Moov).
 *     responses:
 *       200:
 *         description: Notification reçue et validée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: transaction_id manquant.
 *       401:
 *         description: Signature HMAC invalide.
 *       505:
 *         description: Erreur interne lors du traitement du webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-cinetpay-signature");
    const secret = process.env.CINETPAY_API_SECRET;

    let payload: any;
    if (secret && signature) {
      if (!verifyCinetPaySignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
      }
      const contentType = req.headers.get("content-type") || "";
      payload = contentType.includes("application/json")
        ? JSON.parse(rawBody)
        : Object.fromEntries(new URLSearchParams(rawBody).entries());
    } else {
      // Mock/bypass en local
      payload = JSON.parse(rawBody);
      console.log("[Mobile Money Webhook Mock] Notification reçue (sans vérification)");
    }

    const transactionId = payload.cpm_trans_id || payload.transaction_id;
    const status = payload.cpm_result || payload.status;

    if (!transactionId) {
      return NextResponse.json({ error: "transaction_id manquant" }, { status: 400 });
    }

    console.log(`[Mobile Money Webhook] Notification pour transaction ${transactionId}, status: ${status}`);

    if (status === "ACCEPTED" || status === "1" || status === "success") {
      await PaymentService.confirmPayment(transactionId);
    } else if (status === "REFUSED" || status === "CANCELLED" || status === "0" || status === "failed") {
      await PaymentService.failPayment(transactionId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mobile Money Webhook Error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
