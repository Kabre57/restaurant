import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis';
import { OrderType, PaymentStatus, PaymentType } from '@prisma/client';
import { validateApiToken } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const apiKeyHeader = request.headers.get("x-api-key") ?? "";
    let token = authHeader.replace("Bearer ", "").trim();
    if (!token && apiKeyHeader) {
      token = apiKeyHeader.trim();
    }

    const isValid = await validateApiToken(token);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    const body = await request.json();
    const { storeId, cashierId, items, total, type, paymentMode, clientRequestId } = body;

    if (!storeId || !items || !items.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderType = (type || 'DINE_IN') as OrderType;
    const payment = paymentMode || 'ESPECES';

    let paymentType: PaymentType = 'CASH';
    if (payment === 'CB' || payment === 'CARTE') paymentType = 'CARD';
    if (payment === 'MOBILE_MONEY' || payment === 'MOBILE') paymentType = 'MOBILE_MONEY';

    let pm = await prisma.paymentMethod.findFirst({
      where: { storeId, type: paymentType }
    });
    if (!pm) {
      pm = await prisma.paymentMethod.findFirst({
        where: { storeId: null, type: paymentType }
      });
    }
    if (!pm) {
      pm = await prisma.paymentMethod.create({
        data: { name: paymentType === 'CASH' ? 'Espèces' : paymentType, type: paymentType, storeId, isDefault: true }
      });
    }
    const paymentMethodId = pm.id;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          storeId,
          cashierId: cashierId || null,
          total,
          type: orderType,
          clientRequestId: clientRequestId || null,
          status: 'EN_ATTENTE',
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              options: item.options || null,
            })),
          },
          payments: {
            create: [{
              paymentMethodId: paymentMethodId,
              amount: total,
              status: 'REUSSIE' as PaymentStatus
            }]
          }
        },
        include: {
          items: {
            include: { product: true },
          },
          table: true,
          payments: true
        },
      });

      // Simple stock deduction logic
      for (const item of order.items) {
        if (item.product.trackStock) {
          await tx.product.update({
            where: { id: item.product.id },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      }

      return order;
    });

    // Notify KDS
    await redis.publish(`store:${storeId}:orders:ORDER_CREATED`, JSON.stringify(result));

    return NextResponse.json({ success: true, order: result }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  } catch (error: any) {
    console.error('API Orders Error:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('clientRequestId')) {
      return NextResponse.json({ error: 'Order already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
