import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { GET as getPublicProducts } from "@/app/api/public/products/route";
import { GET as getDeliveryEstimate } from "@/app/api/delivery/estimate/route";

type PublicProductsPayload = {
  products?: Array<{
    price?: number;
    costPrice?: number;
  }>;
};

type DeliveryEstimatePayload = {
  deliveryFee?: number;
  preparationDelayMinutes?: number;
};

describe("Configuration e-commerce appliquée au frontend public", () => {
  let storeId: string;
  let categoryId: string;

  beforeEach(async () => {
    const store = await prisma.store.create({
      data: {
        name: `Store Web Config ${Date.now()}`,
        ecommerceEnabled: false,
        deliveryEnabled: false,
        clickAndCollectEnabled: true,
        deliveryFee: 1800,
        preparationDelayMinutes: 45,
      },
    });
    storeId = store.id;

    const category = await prisma.category.create({
      data: {
        name: "Menus web",
        storeId,
      },
    });
    categoryId = category.id;

    await prisma.product.create({
      data: {
        name: "Plat public",
        price: 3000,
        costPrice: 1200,
        storeId,
        categoryId,
        isAvailable: true,
      },
    });
  });

  afterEach(async () => {
    await prisma.product.deleteMany({ where: { storeId } });
    await prisma.category.deleteMany({ where: { storeId } });
    await prisma.store.delete({ where: { id: storeId } });
  });

  it("bloque le catalogue public quand la boutique est désactivée", async () => {
    const response = await getPublicProducts(
      new NextRequest(`http://localhost/api/public/products?storeId=${storeId}`)
    );
    const payload = (await response.json()) as PublicProductsPayload;

    expect(response.status).toBe(403);
    expect(payload.products).toEqual([]);
  });

  it("sert uniquement les champs publics quand la boutique est activée", async () => {
    await prisma.store.update({
      where: { id: storeId },
      data: {
        ecommerceEnabled: true,
        clickAndCollectEnabled: true,
      },
    });

    const response = await getPublicProducts(
      new NextRequest(`http://localhost/api/public/products?storeId=${storeId}`)
    );
    const payload = (await response.json()) as PublicProductsPayload;

    expect(response.status).toBe(200);
    expect(payload.products).toHaveLength(1);
    expect(payload.products?.[0].price).toBe(3000);
    expect(payload.products?.[0].costPrice).toBeUndefined();
  });

  it("renvoie le forfait de livraison configuré et refuse la livraison désactivée", async () => {
    await prisma.store.update({
      where: { id: storeId },
      data: {
        ecommerceEnabled: true,
        deliveryEnabled: false,
      },
    });

    const forbidden = await getDeliveryEstimate(
      new NextRequest(`http://localhost/api/delivery/estimate?storeId=${storeId}&address=Cocody`)
    );
    expect(forbidden.status).toBe(403);

    await prisma.store.update({
      where: { id: storeId },
      data: {
        deliveryEnabled: true,
        deliveryFee: 2200,
      },
    });

    const allowed = await getDeliveryEstimate(
      new NextRequest(`http://localhost/api/delivery/estimate?storeId=${storeId}&address=Cocody`)
    );
    const payload = (await allowed.json()) as DeliveryEstimatePayload;

    expect(allowed.status).toBe(200);
    expect(payload.deliveryFee).toBe(2200);
    expect(payload.preparationDelayMinutes).toBe(45);
  });
});
