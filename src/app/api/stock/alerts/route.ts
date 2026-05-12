import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('storeId');

  if (!storeId) {
    return new Response('Missing storeId', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate();
      await subscriber.subscribe(`store:${storeId}:stock-alert`);

      subscriber.on('message', (channel, message) => {
        controller.enqueue(`data: ${message}\n\n`);
      });

      req.signal.onabort = () => {
        subscriber.unsubscribe();
        subscriber.quit();
        controller.close();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
