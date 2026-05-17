import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');

  if (!storeId) {
    return new Response('storeId is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  const channel = `store:${storeId}:pos-alerts`;

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate();
      let closed = false;

      const send = (payload: string) => {
        if (!closed) controller.enqueue(encoder.encode(payload));
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
    },
  });
}
