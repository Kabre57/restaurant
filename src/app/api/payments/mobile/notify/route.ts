import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';

function mapCinetPayStatus(status: unknown) {
  if (status === 'ACCEPTED') return PaymentStatus.REUSSIE;
  if (status === 'REFUSED' || status === 'CANCELLED') return PaymentStatus.ECHOUEE;
  return PaymentStatus.EN_ATTENTE;
}

export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit(rateLimitKey('mobile-notify', req), 120, 60);
    if (!limit.allowed) return rateLimitResponse(limit);

    const contentType = req.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

    const transactionId = String(payload.cpm_trans_id || payload.transaction_id || '');
    if (!transactionId) {
      return NextResponse.json({ error: 'transaction_id manquant' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        externalRef: {
          contains: transactionId,
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 });
    }

    const status = mapCinetPayStatus(payload.cpm_result || payload.status);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        externalPayload: {
          aggregator: 'CINETPAY',
          transactionId,
          status: status === PaymentStatus.REUSSIE ? 'PAID' : status === PaymentStatus.ECHOUEE ? 'FAILED' : 'PAYMENT_PENDING',
          notification: payload,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur notification CinetPay:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
