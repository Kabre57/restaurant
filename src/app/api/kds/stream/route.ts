import { NextRequest } from 'next/server'
import { redisSub } from '@/lib/redis-sub-manager'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type KDSStation = 'ALL' | 'CUISINE' | 'BAR'

type StreamOrderItem = {
  product?: {
    category?: {
      name?: string | null
    } | null
  } | null
}

type StreamOrderPayload = {
  items?: StreamOrderItem[]
}

function normalizeStation(station: string | null): KDSStation {
  if (station === 'CUISINE' || station === 'BAR') return station
  return 'ALL'
}

function isDrinkItem(item: StreamOrderItem) {
  return item.product?.category?.name?.toLowerCase().includes('boisson') ?? false
}

function filterMessageForStation(message: string, station: KDSStation) {
  if (station === 'ALL') return message

  try {
    const order = JSON.parse(message) as StreamOrderPayload
    const items = order.items ?? []
    const stationItems = items.filter(item =>
      station === 'BAR' ? isDrinkItem(item) : !isDrinkItem(item)
    )

    if (stationItems.length === 0) return null

    return JSON.stringify({ ...order, items: stationItems })
  } catch (error) {
    console.error('Failed to filter KDS event by station:', error)
    return message
  }
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId')
  const station = normalizeStation(req.nextUrl.searchParams.get('station'))
  const session = await getServerSession(authOptions)

  if (!storeId) {
    return new Response('storeId is required', { status: 400 })
  }

  if (!session?.user || session.user.storeId !== storeId) {
    return new Response('Forbidden', { status: 403 })
  }

  const channels = [
    `store:${storeId}:orders:new-order`,
    `store:${storeId}:orders:order-updated`,
    `store:${storeId}:kds-alerts`,
  ]

  const stream = new ReadableStream({
    start(controller) {
      // ✅ Partage la connexion Redis via le singleton — N écrans = 1 seule connexion
      const unsubscribe = redisSub.subscribe(channels, (channel, message) => {
        // Alertes serveur (appel client)
        if (channel === `store:${storeId}:kds-alerts`) {
          controller.enqueue(
            new TextEncoder().encode(`event: server-call\ndata: ${message}\n\n`)
          )
          return
        }

        const stationMessage = filterMessageForStation(message, station)
        if (!stationMessage) return

        const eventName = channel.endsWith('new-order') ? 'new-order' : 'order-updated'
        controller.enqueue(
          new TextEncoder().encode(`event: ${eventName}\ndata: ${stationMessage}\n\n`)
        )
      })

      // Heartbeat — maintient la connexion SSE ouverte (proxy/load balancer timeout)
      const interval = setInterval(() => {
        controller.enqueue(
          new TextEncoder().encode(`event: heartbeat\ndata: ${Date.now()}\n\n`)
        )
      }, 30_000)

      // Cleanup propre à la déconnexion du client
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        unsubscribe() // Désabonne ce client du singleton — aucun quit() nécessaire
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}


