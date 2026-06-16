import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { DeliveryOrderStatus, Role } from "@prisma/client";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { DeliveryService } from "@/services/delivery.service";
import { updateDeliveryStatusSchema } from "@/lib/validation/delivery";
import { BaseError } from "@/shared/errors";
import { requirePermission } from "@/shared/security";
import { hasPermission } from "@/domain/security/guards";

export const dynamic = "force-dynamic";

const DRIVER_PROGRESS_STATUSES = new Set<DeliveryOrderStatus>([
  "PICKED_UP",
  "IN_PROGRESS",
  "DELIVERED",
]);

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
  if (error instanceof BaseError) {
    return error.status;
  }

  const message = error instanceof Error ? error.message : "";
  if (message.includes("Transition de livraison invalide")) {
    return 409;
  }

  return 500;
}

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
    const body = await req.json();
    const result = updateDeliveryStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const securityUser = toSecurityUser(session.user);
    const canOverride = await hasPermission(securityUser, "delivery.status_override");
    const isDriverProgressUpdate =
      result.data.livreurId == null &&
      DRIVER_PROGRESS_STATUSES.has(result.data.status) &&
      !canOverride;

    if (isDriverProgressUpdate) {
      await requirePermission(securityUser, "delivery.pwa_access");
    } else {
      await requirePermission(securityUser, "delivery.status_override");

      if (result.data.status === "ASSIGNED" || result.data.livreurId) {
        await requirePermission(securityUser, "delivery.driver_assign");
      }
    }

    const { prisma } = await import("@/lib/db");
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id },
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

    if (isDriverProgressUpdate && deliveryOrder.livreurId !== session.user.id) {
      return NextResponse.json(
        { error: "Cette course ne vous est pas assignée." },
        { status: 403 }
      );
    }

    const updated = await DeliveryService.updateDeliveryStatus(
      id,
      result.data.status,
      result.data.livreurId
    );

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de mise à jour du statut" },
      { status: getErrorStatus(error) }
    );
  }
}
