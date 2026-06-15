import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { DeliveryService } from "@/services/delivery.service";
import { createDeliveryOrderSchema } from "@/lib/validation/delivery";
import { DeliveryOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createDeliveryOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    // Récupérer le storeId de la commande associée pour valider le multi-tenant
    const { prisma } = await import("@/lib/db");
    const orderObj = await prisma.order.findUnique({
      where: { id: result.data.orderId },
      select: { storeId: true },
    });

    if (!orderObj) {
      return NextResponse.json({ error: "Commande associée introuvable" }, { status: 404 });
    }

    const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, orderObj.storeId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    const deliveryOrder = await DeliveryService.createDeliveryOrder(result.data);
    return NextResponse.json(deliveryOrder, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la création";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const role = session.user.role;
  const targetStoreId = req.nextUrl.searchParams.get("storeId") || session.user.storeId;

  if (!targetStoreId) {
    return NextResponse.json({ error: "storeId est requis" }, { status: 400 });
  }

  const hasAccess = await checkUserStoreAccess(session.user.id, role, targetStoreId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");

  let status: DeliveryOrderStatus | undefined = undefined;
  if (statusParam && Object.values(DeliveryOrderStatus).includes(statusParam as DeliveryOrderStatus)) {
    status = statusParam as DeliveryOrderStatus;
  }

  try {
    const orders = await DeliveryService.getDeliveryOrders({ status, storeId: targetStoreId });
    return NextResponse.json(orders);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur interne du serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

