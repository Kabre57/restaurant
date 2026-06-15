import { NextRequest } from "next/server";
import { redisSub } from "@/lib/redis-sub-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const deliveryOrderId = req.nextUrl.searchParams.get("deliveryOrderId");
  if (!deliveryOrderId) {
    return new Response("deliveryOrderId requis", { status: 400 });
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
          // If the message is coordinates, send as LOCATION. If status, send as STATUS.
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
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
