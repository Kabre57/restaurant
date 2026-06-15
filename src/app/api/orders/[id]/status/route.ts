import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { updateOrderStatus, OrderStatus } from "@/lib/orderService";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   ["PREPARING", "CANCELLED"],
  PREPARING: ["READY",     "CANCELLED"],
  READY:     ["SERVED",    "CANCELLED"],
  SERVED:    ["PAID"],
  PAID:      [],
  CANCELLED: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { id }    = await params;

  try {
    // Récupérer le storeId de la commande pour valider le multi-tenant
    const { prisma } = await import("@/lib/db");
    const orderObj = await prisma.order.findUnique({
      where: { id },
      select: { storeId: true },
    });

    if (!orderObj) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Isolation multi-tenant
    const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, orderObj.storeId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    const { status } = await req.json() as { status: OrderStatus };

    if (!status) {
      return NextResponse.json({ error: "status requis" }, { status: 400 });
    }

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur de mise à jour du statut";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

