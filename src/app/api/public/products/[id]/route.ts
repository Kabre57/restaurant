import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ecommerceSettingsSelect,
  isClosedForOnlineOrders,
  normalizeEcommerceSettings,
} from "@/lib/ecommerce-settings";

/**
 * @openapi
 * /api/public/products/{id}:
 *   get:
 *     summary: Détails d'un produit public actif
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant unique du produit
 *     responses:
 *       200:
 *         description: Détails du produit récupérés avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé ou indisponible.
 *       500:
 *         description: Une erreur est survenue lors de la récupération du produit.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const product = await prisma.product.findFirst({
      where: {
        id,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        store: {
          select: ecommerceSettingsSelect,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produit non trouvé ou indisponible" },
        { status: 404 }
      );
    }

    const settings = normalizeEcommerceSettings(product.store);
    if (
      !settings.ecommerceEnabled ||
      isClosedForOnlineOrders(settings) ||
      (!settings.deliveryEnabled && !settings.clickAndCollectEnabled)
    ) {
      return NextResponse.json({ error: "Boutique fermée temporairement" }, { status: 403 });
    }

    const { store, ...publicProduct } = product;

    return NextResponse.json({ product: publicProduct });
  } catch (error) {
    console.error("Public Product Detail GET Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération du produit" },
      { status: 500 }
    );
  }
}
