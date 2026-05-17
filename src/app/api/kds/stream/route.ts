import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type KDSStation = 'ALL' | 'CUISINE' | 'BAR';

type StreamOrderItem = {
  product?: {
    category?: {
      name?: string | null;
    } | null;
  } | null;
};

type StreamOrderPayload = {
  items?: StreamOrderItem[];
};

function normalizeStation(station: string | null): KDSStation {
  if (station === 'CUISINE' || station === 'BAR') return station;
  return 'ALL';
}

function isDrinkItem(item: StreamOrderItem) {
  return item.product?.category?.name?.toLowerCase().includes('boisson') ?? false;
}

function filterMessageForStation(message: string, station: KDSStation) {
  if (station === 'ALL') return message;

  try {
    const order = JSON.parse(message) as StreamOrderPayload;
    const items = order.items ?? [];
    const stationItems = items.filter(item => station === 'BAR' ? isDrinkItem(item) : !isDrinkItem(item));

    if (stationItems.length === 0) return null;

    return JSON.stringify({
      ...order,
      items: stationItems,
    });
  } catch (error) {
    console.error('Failed to filter KDS event by station:', error);
    return message;
  }
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');
  const station = normalizeStation(req.nextUrl.searchParams.get('station'));
  const session = await getServerSession(authOptions);

  if (!storeId) {
    return new Response('storeId is required', { status: 400 });
  }

  if (!session?.user || session.user.storeId !== storeId) {
    return new Response('Forbidden', { status: 403 });
  }

  const newOrderChannel = `store:${storeId}:orders:new-order`;
  const updatedOrderChannel = `store:${storeId}:orders:order-updated`;
  const kdsAlertsChannel = `store:${storeId}:kds-alerts`;

  const stream = new ReadableStream({
    async start(controller) {
      // Créer une connexion Redis dupliquée pour l'abonnement (Redis nécessite une connexion dédiée pour SUB)
      const subscriber = redis.duplicate();

      await subscriber.subscribe(newOrderChannel, updatedOrderChannel, kdsAlertsChannel);

      subscriber.on('message', (channel, message) => {
        if (channel === kdsAlertsChannel) {
          const eventData = `event: server-call\ndata: ${message}\n\n`;
          controller.enqueue(new TextEncoder().encode(eventData));
          return;
        }

        const stationMessage = filterMessageForStation(message, station);
        if (!stationMessage) return;

        const eventName = channel === newOrderChannel ? 'new-order' : 'order-updated';
        // Envoie de l'événement au client via SSE
        const eventData = `event: ${eventName}\ndata: ${stationMessage}\n\n`;
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
