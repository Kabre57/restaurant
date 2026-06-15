import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { DeliveryService } from "@/services/delivery.service";
import { updateDeliveryStatusSchema } from "@/lib/validation/delivery";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Récupérer la commande de livraison pour vérifier le storeId
    const { prisma } = await import("@/lib/db");
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!deliveryOrder) {
      return NextResponse.json({ error: "Commande de livraison introuvable" }, { status: 404 });
    }

    // Validation multi-tenant
    const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, deliveryOrder.order.storeId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateDeliveryStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const updated = await DeliveryService.updateDeliveryStatus(
      id,
      result.data.status,
      result.data.livreurId
    );

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur de mise à jour du statut";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

