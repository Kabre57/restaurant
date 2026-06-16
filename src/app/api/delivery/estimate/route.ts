import { NextRequest, NextResponse } from "next/server";
import { DeliveryService } from "@/services/delivery.service";
import { estimateDeliverySchema } from "@/lib/validation/delivery";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const storeId = req.nextUrl.searchParams.get("storeId");

  const result = estimateDeliverySchema.safeParse({ address, storeId });

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  try {
    const quote = await DeliveryService.getDeliveryQuote(result.data.address, result.data.storeId, {
      requireEnabled: true,
    });

    return NextResponse.json(quote);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur d'estimation de la livraison";
    return NextResponse.json(
      {
        error: msg,
      },
      {
        status:
          msg.includes("disponible") || msg.includes("Boutique fermée temporairement")
            ? 403
            : 400,
      }
    );
  }
}
