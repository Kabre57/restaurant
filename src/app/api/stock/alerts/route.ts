import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('storeId');

  if (!storeId) {
    return new Response('Missing storeId', { status: 400 });
  }

  const encoder = new TextEncoder();
  const channel = `store:${storeId}:stock-alert`;

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate();
      let closed = false;

      const sendEvent = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      };

      const heartbeat = setInterval(() => {
        sendEvent(`event: heartbeat\ndata: ${Date.now()}\n\n`);
      }, 30000);

      sendEvent(`event: ready\ndata: connected\n\n`);

      try {
        await subscriber.subscribe(channel);
        subscriber.on('message', (messageChannel, message) => {
          if (messageChannel !== channel) return;
          sendEvent(`data: ${message}\n\n`);
        });
      } catch (error) {
        console.error('Stock alerts stream unavailable:', error);
        sendEvent(`event: warning\ndata: alerts-unavailable\n\n`);
      }

      req.signal.addEventListener('abort', async () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);

        try {
          await subscriber.unsubscribe(channel);
        } catch {}

        subscriber.disconnect();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
