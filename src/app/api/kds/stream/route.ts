import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      // Créer une connexion Redis dupliquée pour l'abonnement (Redis nécessite une connexion dédiée pour SUB)
      const subscriber = redis.duplicate();

      await subscriber.subscribe('new-order', 'order-updated');

      subscriber.on('message', (channel, message) => {
        // Envoie de l'événement au client via SSE
        const eventData = `event: ${channel}\ndata: ${message}\n\n`;
        controller.enqueue(new TextEncoder().encode(eventData));
      });

      // Garder la connexion ouverte en envoyant des ping réguliers
      const interval = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(': ping\n\n'));
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
