import { NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Authentification requise", { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get('storeId') || session.user.storeId;

  if (!storeId) {
    return new Response('storeId is required', { status: 400 });
  }

  // Isolation multi-tenant
  const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, storeId);
  if (!hasAccess) {
    return new Response("Accès refusé à cet établissement", { status: 403 });
  }

  const encoder = new TextEncoder();
  const channel = `store:${storeId}:pos-alerts`;

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate();
      let closed = false;

      const send = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      };

      const heartbeat = setInterval(() => {
        send(`event: heartbeat\ndata: ${Date.now()}\n\n`);
      }, 30000);

      await subscriber.subscribe(channel);
      subscriber.on('message', (messageChannel, message) => {
        if (messageChannel !== channel) return;
        send(`event: server-call\ndata: ${message}\n\n`);
      });

      req.signal.addEventListener('abort', async () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        await subscriber.unsubscribe(channel);
        subscriber.disconnect();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
