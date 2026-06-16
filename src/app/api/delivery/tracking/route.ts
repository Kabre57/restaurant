import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { DeliveryService } from "@/services/delivery.service";
import { sendTrackingSchema } from "@/lib/validation/delivery";
import { BaseError } from "@/shared/errors";
import { requirePermission } from "@/shared/security";

export const dynamic = "force-dynamic";

const ACTIVE_DELIVERY_STATUSES = new Set(["ASSIGNED", "PICKED_UP", "IN_PROGRESS"]);

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = sendTrackingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const securityUser = toSecurityUser(session.user);
    await requirePermission(securityUser, "delivery.pwa_access");

    const { prisma } = await import("@/lib/db");
    const checkAccess = await prisma.deliveryOrder.findUnique({
      where: { id: result.data.deliveryOrderId },
      include: { order: true },
    });

    if (!checkAccess) {
      return NextResponse.json({ error: "Commande de livraison introuvable" }, { status: 404 });
    }

    const hasAccess = await checkUserStoreAccess(
      session.user.id,
      session.user.role,
      checkAccess.order.storeId
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    if (checkAccess.livreurId !== session.user.id) {
      return NextResponse.json(
        { error: "Cette course ne vous est pas assignée." },
        { status: 403 }
      );
    }

    if (!ACTIVE_DELIVERY_STATUSES.has(checkAccess.status)) {
      return NextResponse.json(
        { error: "Cette course n'est pas encore en cours de livraison." },
        { status: 409 }
      );
    }

    const tracking = await DeliveryService.trackDriverLocation(
      result.data.deliveryOrderId,
      session.user.id,
      result.data.latitude,
      result.data.longitude
    );

    return NextResponse.json(tracking, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de mise à jour de la position" },
      { status: getErrorStatus(error) }
    );
  }
}
