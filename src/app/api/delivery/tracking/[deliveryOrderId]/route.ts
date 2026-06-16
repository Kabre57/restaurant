import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { TrackingService } from "@/services/tracking.service";
import { BaseError } from "@/shared/errors";
import { requirePermission } from "@/shared/security";

export const dynamic = "force-dynamic";

function toSecurityUser(sessionUser: {
  id: string;
  role: string;
  storeId?: string | null;
}) {
  return {
    id: sessionUser.id,
    role: sessionUser.role as Role,
    storeId: sessionUser.storeId ?? "",
  };
}

function getErrorStatus(error: unknown): number {
  return error instanceof BaseError ? error.status : 500;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deliveryOrderId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { deliveryOrderId } = await params;

  try {
    const securityUser = toSecurityUser(session.user);
    await requirePermission(securityUser, "delivery.gps_tracking");

    const { prisma } = await import("@/lib/db");
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: { order: true },
    });

    if (!deliveryOrder) {
      return NextResponse.json({ error: "Commande de livraison introuvable" }, { status: 404 });
    }

    const hasAccess = await checkUserStoreAccess(
      session.user.id,
      session.user.role,
      deliveryOrder.order.storeId
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    const trackingHistory = await TrackingService.getTrackingHistory(deliveryOrderId);
    return NextResponse.json(trackingHistory);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne du serveur" },
      { status: getErrorStatus(error) }
    );
  }
}
