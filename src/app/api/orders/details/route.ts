import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/services/order.service";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Limite de requêtes : 20 par minute pour éviter le brute force des UUIDs
  const ipKey = rateLimitKey("order-details", req);
  const rateLimitResult = await checkRateLimit(ipKey, 20, 60);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "L'ID de la commande est requis" }, { status: 400 });
    }

    const order = await OrderService.getEcommerceOrderDetails(id);

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: error.message || "Impossible de récupérer les détails" },
      { status: 500 }
    );
  }
}

