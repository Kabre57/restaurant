import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db'
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';

type CinetPayPayload = Record<string, unknown>;

function mapCinetPayStatus(status: unknown) {
  if (status === 'ACCEPTED') return PaymentStatus.REUSSIE;
  if (status === 'REFUSED' || status === 'CANCELLED') return PaymentStatus.ECHOUEE;
  return PaymentStatus.EN_ATTENTE;
}

function getString(payload: CinetPayPayload, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function timingSafeCompare(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function verifyCinetPaySignature(rawBody: string, signatureHeader: string | null, secret?: string) {
  if (!signatureHeader || !secret) return false;

  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const signature = signatureHeader.trim();

  return [digest, `sha256=${digest}`].some((expected) => timingSafeCompare(signature, expected));
}

function parsePayload(rawBody: string, contentType: string): CinetPayPayload {
  if (contentType.includes('application/json')) {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CinetPayPayload;
    }
    return {};
  }

  return Object.fromEntries(new URLSearchParams(rawBody).entries());
}

function parseMetadata(value: unknown): CinetPayPayload {
  if (typeof value !== 'string' || !value.trim()) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CinetPayPayload;
    }
  } catch {
    return {};
  }

  return {};
}

export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit(rateLimitKey('mobile-notify', req), 120, 60);
    if (!limit.allowed) return rateLimitResponse(limit);

    const rawBody = await req.text();
    const signature = req.headers.get('x-cinetpay-signature');
    const secret = process.env.CINETPAY_API_SECRET;

    if (!secret) {
      return NextResponse.json({ error: 'CINETPAY_API_SECRET non configuré' }, { status: 503 });
    }

    if (!verifyCinetPaySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const payload = parsePayload(rawBody, contentType);

    const transactionId = getString(payload, 'cpm_trans_id', 'transaction_id');
    if (!transactionId) {
      return NextResponse.json({ error: 'transaction_id manquant' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        status: PaymentStatus.EN_ATTENTE,
        externalRef: {
          contains: transactionId,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            storeId: true,
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Paiement en attente introuvable' }, { status: 404 });
    }

    const metadata = parseMetadata(payload.metadata);
    const metadataPaymentId = getString(metadata, 'paymentId');
    const metadataOrderId = getString(metadata, 'orderId');
    const metadataStoreId = getString(metadata, 'storeId');

    if (
      (metadataPaymentId && metadataPaymentId !== payment.id) ||
      (metadataOrderId && metadataOrderId !== payment.orderId) ||
      (metadataStoreId && metadataStoreId !== payment.order.storeId)
    ) {
      return NextResponse.json({ error: 'Notification hors périmètre paiement' }, { status: 403 });
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
          notification: payload as Prisma.InputJsonValue,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur notification CinetPay:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
