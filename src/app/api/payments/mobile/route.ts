import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { formatZodError, mobilePaymentSchema } from '@/lib/validation/schemas';

const CINETPAY_PAYMENT_URL = 'https://api-checkout.cinetpay.com/v2/payment';

type CinetPayResponse = {
  code?: string;
  message?: string;
  description?: string;
  data?: {
    payment_token?: string;
    payment_url?: string;
  };
  api_response_id?: string;
};

function getPublicBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || req.nextUrl.origin;
}

function buildTransactionId(orderId: string) {
  return `CP${orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}${Date.now().toString(36)}${randomUUID().slice(0, 8)}`;
}

function getCinetPayConfig(req: NextRequest) {
  const apikey = process.env.CINETPAY_APIKEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  const currency = process.env.CINETPAY_CURRENCY || 'XOF';
  const baseUrl = getPublicBaseUrl(req);

  if (!apikey || !siteId) {
    return {
      ok: false as const,
      error: 'CinetPay n’est pas configuré. Renseignez CINETPAY_APIKEY et CINETPAY_SITE_ID.',
    };
  }

  return {
    ok: true as const,
    apikey,
    siteId,
    currency,
    notifyUrl: process.env.CINETPAY_NOTIFY_URL || `${baseUrl}/api/payments/mobile/notify`,
    returnUrl: process.env.CINETPAY_RETURN_URL || baseUrl,
  };
}

async function upsertPendingMobilePayment(orderId: string, amount: number, externalRef: string) {
  const existingPayment = await prisma.payment.findFirst({
    where: {
      orderId,
      method: PaymentMethod.MOBILE_MONEY,
      status: PaymentStatus.EN_ATTENTE,
    },
  });

  if (existingPayment) {
    return prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        amount,
        externalRef,
      },
    });
  }

  return prisma.payment.create({
    data: {
      orderId,
      method: PaymentMethod.MOBILE_MONEY,
      status: PaymentStatus.EN_ATTENTE,
      amount,
      externalRef,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit(rateLimitKey('mobile-payment', req), 20, 60);
    if (!limit.allowed) return rateLimitResponse(limit);

    const parsed = mobilePaymentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { orderId, provider, phone, amount } = parsed.data;

    const numericAmount = Math.round(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    if (numericAmount % 5 !== 0) {
      return NextResponse.json({ error: 'CinetPay exige un montant multiple de 5' }, { status: 400 });
    }

    const config = getCinetPayConfig(req);
    if (!config.ok) {
      return NextResponse.json({ error: config.error }, { status: 503 });
    }

    const order = await prisma.order.findUnique({
      where: { id: String(orderId) },
      include: {
        store: true,
        table: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    const transactionId = buildTransactionId(order.id);
    const externalRef = JSON.stringify({
      aggregator: 'CINETPAY',
      provider,
      phone,
      transactionId,
    });

    const payment = await upsertPendingMobilePayment(order.id, numericAmount, externalRef);

    const payload = {
      apikey: config.apikey,
      site_id: config.siteId,
      transaction_id: transactionId,
      amount: numericAmount,
      currency: config.currency,
      description: `Commande ${order.table ? `table ${order.table.number}` : order.id.slice(-6)} - ${order.store.name}`,
      notify_url: config.notifyUrl,
      return_url: config.returnUrl,
      channels: 'MOBILE_MONEY',
      lang: 'fr',
      metadata: JSON.stringify({
        orderId: order.id,
        paymentId: payment.id,
        provider,
        tableId: order.tableId,
        storeId: order.storeId,
      }),
      lock_phone_number: true,
      customer_phone_number: String(phone),
      customer_name: 'Client',
      customer_surname: 'Table',
      customer_email: process.env.CINETPAY_CUSTOMER_EMAIL || 'client@example.com',
      customer_address: order.store.address || 'Restaurant',
      customer_city: process.env.CINETPAY_CUSTOMER_CITY || 'Abidjan',
      customer_country: process.env.CINETPAY_CUSTOMER_COUNTRY || 'CI',
      customer_state: process.env.CINETPAY_CUSTOMER_STATE || 'CI',
      customer_zip_code: process.env.CINETPAY_CUSTOMER_ZIP || '00000',
      invoice_data: {
        Restaurant: order.store.name,
        Table: order.table?.number?.toString() || '-',
        Operateur: provider,
      },
    };

    const response = await fetch(CINETPAY_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'restaurant-pos/1.0',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as CinetPayResponse;

    if (!response.ok || result.code !== '201' || !result.data?.payment_url) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.ECHOUEE },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: {
          externalPayload: {
            aggregator: 'CINETPAY',
            provider,
            phone,
            transactionId,
            paymentId: payment.id,
            status: 'INITIALIZATION_FAILED',
            response: result as Prisma.InputJsonValue,
          },
        },
      });

      return NextResponse.json({
        error: result.description || result.message || 'Échec de l’initialisation CinetPay',
        providerResponse: result,
      }, { status: 502 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        externalPayload: {
          aggregator: 'CINETPAY',
          provider,
          phone,
          transactionId,
          paymentId: payment.id,
          paymentToken: result.data.payment_token,
          paymentUrl: result.data.payment_url,
          status: 'PAYMENT_PENDING',
        },
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      transactionId,
      paymentUrl: result.data.payment_url,
      paymentToken: result.data.payment_token,
    });
  } catch (error) {
    console.error('Erreur API Paiement Mobile:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
