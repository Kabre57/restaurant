import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ecommerceSettingsSelect, normalizeEcommerceSettings } from "@/lib/ecommerce-settings";

export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "Le paramètre storeId est requis" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: ecommerceSettingsSelect,
    });

    if (!store) {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }

    return NextResponse.json({ settings: normalizeEcommerceSettings(store) });
  } catch (error) {
    console.error("Public Ecommerce Settings GET Error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération des paramètres e-commerce" },
      { status: 500 }
    );
  }
}
