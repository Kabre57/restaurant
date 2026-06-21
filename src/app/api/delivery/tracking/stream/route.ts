import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { BaseError } from "@/shared/errors";
import { requirePermission } from "@/shared/security";
import { Permission } from "@/domain/security/permissions";
import { redisSub } from "@/lib/redis-sub-manager";

export const runtime = "nodejs";
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const deliveryOrderId = req.nextUrl.searchParams.get("deliveryOrderId");
  if (!deliveryOrderId) {
    return NextResponse.json({ error: "deliveryOrderId requis" }, { status: 400 });
  }

  try {
    const securityUser = toSecurityUser(session.user);
    await requirePermission(securityUser, Permission.DELIVERY_GPS_TRACKING);

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

    const encoder = new TextEncoder();
    const statusChannel = `delivery:${deliveryOrderId}:status`;
    const locationChannel = `delivery:${deliveryOrderId}:location`;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        send({ event: "CONNECTED", deliveryOrderId });

        const unsubscribe = redisSub.subscribe([statusChannel, locationChannel], (ch, message) => {
          try {
            const parsed = JSON.parse(message);
            const type = ch.endsWith(":location") ? "LOCATION" : "STATUS";
            send({ type, ...parsed });
          } catch {
            // Ignore parse errors
          }
        });

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 25_000);

        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne du serveur" },
      { status: getErrorStatus(error) }
    );
  }
}
