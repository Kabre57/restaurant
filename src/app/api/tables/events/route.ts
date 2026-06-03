// src/app/api/tables/events/route.ts
// Server-Sent Events (SSE) — diffusion temps réel réelle des changements de table
// Le client s'abonne avec : new EventSource('/api/tables/events?restaurantId=xxx')

import { NextRequest } from "next/server";
import { prisma } from '@/lib/db'
import { TableData, TableStatus } from "../route";

export const runtime = "nodejs"; // SSE nécessite Node.js runtime (pas Edge)
export const dynamic = "force-dynamic";

function getZoneInfo(tableNumber: number) {
  if (tableNumber <= 2) {
    return { zone: "Terrasse", zoneId: "z1" };
  } else if (tableNumber <= 5) {
    return { zone: "Salle Principale", zoneId: "z2" };
  } else {
    return { zone: "Étage", zoneId: "z3" };
  }
}

function mapPrismaStatus(status: string): TableStatus {
  switch (status) {
    case "AVAILABLE": return "LIBRE";
    case "OCCUPIED": return "OCCUPEE";
    case "RESERVED": return "RESERVEE";
    default: return "LIBRE";
  }
}

export async function GET(req: NextRequest) {
  let restaurantId = req.nextUrl.searchParams.get("restaurantId") ?? "store-main";
  if (restaurantId === "default") {
    restaurantId = "store-main";
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // 1. Snapshot initial réel au moment de la connexion
      let currentTables: TableData[] = [];
      try {
        const dbTables = await prisma.table.findMany({
          where: { storeId: restaurantId },
          orderBy: { number: 'asc' },
        });
        currentTables = dbTables.map((t) => {
          const zoneInfo = getZoneInfo(t.number);
          return {
            id:             t.id,
            number:         `T-${t.number.toString().padStart(2, '0')}`,
            seats:          t.capacity,
            status:         mapPrismaStatus(t.status),
            zone:           zoneInfo.zone,
            zoneId:         zoneInfo.zoneId,
            occupiedSince:  t.status === "OCCUPIED" ? t.updatedAt.toISOString() : null,
            currentOrderId: null,
            updatedAt:      t.updatedAt.toISOString(),
          };
        });
      } catch (err) {
        console.error("[SSE /api/tables/events] Erreur snapshot :", err);
      }

      send({ event: "SNAPSHOT", tables: currentTables, restaurantId });

      // 2. Abonnement Redis pour les mises à jour temps réel
      try {
        const { redisSub, REDIS_CHANNELS } = await import("@/lib/redis");
        const channel = REDIS_CHANNELS.tableUpdated(restaurantId);

        await redisSub.subscribe(channel);

        redisSub.on("message", (...args: unknown[]) => {
          const [ch, message] = args as [string, string];
          if (ch === channel) {
            try {
              send(JSON.parse(message));
            } catch { /* skip malformed */ }
          }
        });

        // Heartbeat toutes les 25s pour garder la connexion ouverte
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 25_000);

        // Cleanup à la déconnexion du client
        req.signal.addEventListener("abort", async () => {
          clearInterval(heartbeat);
          try {
            await redisSub.unsubscribe(channel);
          } catch { /* silent */ }
          controller.close();
        });
      } catch {
        // Fallback sans Redis
        const interval = setInterval(async () => {
          try {
            const dbTables = await prisma.table.findMany({
              where: { storeId: restaurantId },
              orderBy: { number: 'asc' },
            });
            const updated = dbTables.map((t) => {
              const zoneInfo = getZoneInfo(t.number);
              return {
                id:             t.id,
                number:         `T-${t.number.toString().padStart(2, '0')}`,
                seats:          t.capacity,
                status:         mapPrismaStatus(t.status),
                zone:           zoneInfo.zone,
                zoneId:         zoneInfo.zoneId,
                occupiedSince:  t.status === "OCCUPIED" ? t.updatedAt.toISOString() : null,
                currentOrderId: null,
                updatedAt:      t.updatedAt.toISOString(),
              };
            });
            send({ event: "SNAPSHOT", tables: updated, restaurantId });
          } catch { /* silent */ }
        }, 10_000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // Nginx : désactive le buffering
    },
  });
}
