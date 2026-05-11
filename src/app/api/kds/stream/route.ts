import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');
  const session = await getServerSession(authOptions);

  if (!storeId) {
    return new Response('storeId is required', { status: 400 });
  }

  if (!session?.user || session.user.storeId !== storeId) {
    return new Response('Forbidden', { status: 403 });
  }

  const newOrderChannel = `store:${storeId}:orders:new-order`;
  const updatedOrderChannel = `store:${storeId}:orders:order-updated`;

  const stream = new ReadableStream({
    async start(controller) {
      // Créer une connexion Redis dupliquée pour l'abonnement (Redis nécessite une connexion dédiée pour SUB)
      const subscriber = redis.duplicate();

      await subscriber.subscribe(newOrderChannel, updatedOrderChannel);

      subscriber.on('message', (channel, message) => {
        const eventName = channel === newOrderChannel ? 'new-order' : 'order-updated';
        // Envoie de l'événement au client via SSE
        const eventData = `event: ${eventName}\ndata: ${message}\n\n`;
        controller.enqueue(new TextEncoder().encode(eventData));
      });

      // Garder la connexion ouverte en envoyant des ping réguliers
      const interval = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(`event: heartbeat\ndata: ${Date.now()}\n\n`));
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        subscriber.unsubscribe();
        subscriber.quit();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
