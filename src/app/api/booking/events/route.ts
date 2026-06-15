import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { redisSub } from "@/lib/redis-sub-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Authentification requise", { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId") || session.user.storeId;
  if (!storeId) {
    return new Response("storeId requis", { status: 400 });
  }

  // Isolation multi-tenant
  const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, storeId);
  if (!hasAccess) {
    return new Response("Accès refusé à cet établissement", { status: 403 });
  }


  const encoder = new TextEncoder();
  const channel = `booking-events:${storeId}`;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ event: "CONNECTED", storeId });

      const unsubscribe = redisSub.subscribe([channel], (ch, message) => {
        try {
          send(JSON.parse(message));
        } catch {
          // ignorer
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
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
