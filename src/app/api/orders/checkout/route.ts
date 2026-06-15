import { NextRequest, NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import { OrderService } from "@/services/order.service";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

/**
 * @openapi
 * /api/orders/checkout:
 *   post:
 *     summary: Passer une commande e-commerce (online checkout)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerName, customerPhone, deliveryType, paymentMethod, storeId, items]
 *             properties:
 *               customerName:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *                 format: email
 *               deliveryType:
 *                 type: string
 *                 enum: [DELIVERY, CLICK_AND_COLLECT]
 *               deliveryAddress:
 *                 type: string
 *               customerNotes:
 *                 type: string
 *               requestedFulfillmentAt:
 *                 type: string
 *                 format: date-time
 *               paymentMethod:
 *                 type: string
 *                 enum: [CARD, ORANGE_MONEY, MTN_MONEY]
 *               storeId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Commande créée et intention de paiement initialisée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 order:
 *                   type: object
 *                 payment:
 *                   type: object
 *       400:
 *         description: Validation échouée ou stock insuffisant.
 */
export async function POST(request: NextRequest) {
  // Limite de requêtes : 10 par minute pour éviter le spam transactionnel
  const ipKey = rateLimitKey("order-checkout", request);
  const rateLimitResult = await checkRateLimit(ipKey, 10, 60);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();

    // 1. Validation de l'entrée avec Zod
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    // 2. Création de la commande et initialisation du paiement
    const result = await OrderService.createEcommerceOrder(validation.data);

    return NextResponse.json({
      success: true,
      message: "Commande créée avec succès",
      order: {
        id: result.order.id,
        total: result.order.total,
        status: result.order.status,
      },
      payment: result.payment,
    });
  } catch (error: unknown) {
    console.error("Checkout POST Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Une erreur est survenue lors de la validation de la commande",
      },
      { status: 400 }
    );
  }
}
