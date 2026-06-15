import { NextRequest, NextResponse } from "next/server";
import { DeliveryService } from "@/services/delivery.service";
import { estimateDeliverySchema } from "@/lib/validation/delivery";
import { prisma } from "@/lib/db";
import {
  assertEcommerceOrderAllowed,
  ecommerceSettingsSelect,
  normalizeEcommerceSettings,
} from "@/lib/ecommerce-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const storeId = req.nextUrl.searchParams.get("storeId");

  const result = estimateDeliverySchema.safeParse({ address, storeId });

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id: result.data.storeId },
      select: ecommerceSettingsSelect,
    });

    if (!store) {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }

    const settings = normalizeEcommerceSettings(store);
    try {
      assertEcommerceOrderAllowed(settings, "DELIVERY");
    } catch {
      return NextResponse.json({ error: "Livraison indisponible pour ce restaurant" }, { status: 403 });
    }

    const estimation = await DeliveryService.estimateDelivery(result.data.address, result.data.storeId);
    return NextResponse.json({
      ...estimation,
      deliveryFee: settings.deliveryFee,
      preparationDelayMinutes: settings.preparationDelayMinutes,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur d'estimation de la livraison";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
