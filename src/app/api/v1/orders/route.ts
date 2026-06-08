import { NextResponse } from 'next/server';
import { DeliveryPlatform, OrderStatus, OrderType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis';
import { readApiTokenFromRequest, validateApiToken } from '@/lib/api-auth';
import { checkRecipeAvailability, decrementIngredientInventory } from '@/app/actions/inventory/inventory';

const orderInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  },
  table: true,
  payments: true
} satisfies Prisma.OrderInclude;

const publicOrderSchema = z.object({
  clientRequestId: z.string().trim().min(1).max(160).optional(),
  externalOrderId: z.string().trim().min(1).max(160).optional(),
  sourcePlatform: z.nativeEnum(DeliveryPlatform).optional(),
  platform: z.nativeEnum(DeliveryPlatform).optional(),
  type: z.nativeEnum(OrderType).optional().default(OrderType.DINE_IN),
  tableId: z.string().trim().min(1).optional(),
  customerName: z.string().trim().max(160).optional().nullable(),
  customerPhone: z.string().trim().max(40).optional().nullable(),
  deliveryAddress: z.string().trim().max(500).optional().nullable(),
  customerNotes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
    options: z.string().trim().max(500).optional().nullable(),
  })).min(1),
});

class ApiRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ProductForOrder = {
  id: string;
  name: string;
  price: number;
  trackStock: boolean;
  stockQuantity: number;
  minStockLevel: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function buildExternalPayload(input: {
  tokenId: string;
  clientRequestId?: string;
  externalOrderId?: string;
  sourcePlatform: DeliveryPlatform;
}): Prisma.InputJsonObject {
  return {
    source: 'api-v1',
    tokenId: input.tokenId,
    clientRequestId: input.clientRequestId ?? null,
    externalOrderId: input.externalOrderId ?? null,
    sourcePlatform: input.sourcePlatform,
  };
}

async function findReplayOrder(input: {
  storeId: string;
  clientRequestId?: string;
  sourcePlatform: DeliveryPlatform;
  externalOrderId?: string;
}) {
  if (input.clientRequestId) {
    const existing = await prisma.order.findUnique({
      where: { clientRequestId: input.clientRequestId },
      include: orderInclude,
    });

    if (existing) {
      if (existing.storeId !== input.storeId) {
        throw new ApiRouteError('Identifiant de synchronisation invalide', 409);
      }
      return existing;
    }
  }

  if (input.externalOrderId) {
    return prisma.order.findFirst({
      where: {
        storeId: input.storeId,
        sourcePlatform: input.sourcePlatform,
        externalOrderId: input.externalOrderId,
      },
      include: orderInclude,
    });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const tokenContext = await validateApiToken(readApiTokenFromRequest(request));
    if (!tokenContext) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = publicOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const storeId = tokenContext.storeId;
    const sourcePlatform = input.sourcePlatform ?? input.platform ?? DeliveryPlatform.GENERIC;
    const clientRequestId = input.clientRequestId ?? request.headers.get('Idempotency-Key')?.trim() ?? undefined;
    const externalOrderId = input.externalOrderId ?? clientRequestId ?? undefined;

    const replayOrder = await findReplayOrder({
      storeId,
      clientRequestId,
      sourcePlatform,
      externalOrderId,
    });

    if (replayOrder) {
      return NextResponse.json({ success: true, order: replayOrder, replayed: true });
    }

    if (input.tableId) {
      const table = await prisma.table.findFirst({
        where: { id: input.tableId, storeId },
        select: { id: true }
      });

      if (!table) {
        return NextResponse.json({ error: 'Table introuvable pour ce restaurant' }, { status: 400 });
      }
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        trackStock: true,
        stockQuantity: true,
        minStockLevel: true,
      }
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Un ou plusieurs produits sont introuvables ou indisponibles' }, { status: 422 });
    }

    const productMap = new Map<string, ProductForOrder>(products.map((product) => [product.id, product]));
    const total = roundCurrency(input.items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0));

    const order = await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new ApiRouteError('Produit introuvable', 422);
        }

        if (product.trackStock && product.stockQuantity < item.quantity) {
          throw new ApiRouteError(`Stock insuffisant pour ${product.name}`, 409);
        }

        const recipeAvailability = await checkRecipeAvailability(tx, storeId, item.productId, item.quantity);
        if (!recipeAvailability.success) {
          throw new ApiRouteError(recipeAvailability.error ?? 'Stock recette insuffisant', 409);
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          storeId,
          cashierId: null,
          tableId: input.tableId ?? null,
          total,
          type: input.type,
          status: OrderStatus.EN_ATTENTE,
          clientRequestId: clientRequestId ?? null,
          sourcePlatform,
          externalOrderId: externalOrderId ?? null,
          customerName: input.customerName ?? null,
          customerPhone: input.customerPhone ?? null,
          deliveryAddress: input.deliveryAddress ?? null,
          customerNotes: input.customerNotes ?? null,
          externalPayload: buildExternalPayload({
            tokenId: tokenContext.tokenId,
            clientRequestId,
            externalOrderId,
            sourcePlatform,
          }),
          items: {
            create: input.items.map((item) => {
              const product = productMap.get(item.productId);
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: product?.price ?? 0,
                options: item.options ?? null,
              };
            })
          }
        },
        include: orderInclude,
      });

      for (const item of input.items) {
        const product = productMap.get(item.productId);

        await decrementIngredientInventory(tx, storeId, item.productId, item.quantity);

        if (product?.trackStock) {
          const stockUpdate = await tx.product.updateMany({
            where: {
              id: item.productId,
              storeId,
              stockQuantity: { gte: item.quantity },
            },
            data: {
              stockQuantity: { decrement: item.quantity },
            }
          });

          if (stockUpdate.count !== 1) {
            throw new ApiRouteError(`Stock insuffisant pour ${product.name}`, 409);
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              storeId,
              quantity: -item.quantity,
              reason: 'SALE',
              referenceId: createdOrder.id,
              note: 'Commande API v1',
            }
          });
        }
      }

      return createdOrder;
    });

    await redis.publish(`store:${storeId}:orders:new-order`, JSON.stringify(order));
    await redis.publish(`store:${storeId}:pos-alerts`, JSON.stringify({
      type: 'ORDER_CREATED',
      storeId,
      orderId: order.id,
      tableNumber: order.table?.number,
      total: order.total,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, order }, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  } catch (error) {
    console.error('API Orders Error:', error);

    if (error instanceof ApiRouteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Order already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, Idempotency-Key',
    },
  });
}
