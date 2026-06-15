import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  ecommerceSettingsSelect,
  isClosedForOnlineOrders,
  normalizeEcommerceSettings,
} from "@/lib/ecommerce-settings";

/**
 * @openapi
 * /api/public/products:
 *   get:
 *     summary: Liste des produits disponibles en ligne
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du magasin pour filtrer les produits
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filtrer par catégorie de produit
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Terme de recherche sur le nom du produit
 *     responses:
 *       200:
 *         description: Succès de la récupération des produits publics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Le paramètre storeId est requis.
 *       500:
 *         description: Une erreur est survenue lors de la récupération des produits.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    if (!storeId) {
      return NextResponse.json(
        { error: "Le paramètre storeId est requis" },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: ecommerceSettingsSelect,
    });

    if (!store) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 }
      );
    }

    const settings = normalizeEcommerceSettings(store);
    if (
      !settings.ecommerceEnabled ||
      isClosedForOnlineOrders(settings) ||
      (!settings.deliveryEnabled && !settings.clickAndCollectEnabled)
    ) {
      return NextResponse.json(
        { error: "Boutique fermée temporairement", products: [] },
        { status: 403 }
      );
    }

    const whereClause: Prisma.ProductWhereInput = {
      storeId,
      isAvailable: true,
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
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
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Public Products GET Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération des produits" },
      { status: 500 }
    );
  }
}
