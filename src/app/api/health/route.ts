import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const status: Record<string, any> = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      database: 'DOWN',
      redis: 'DOWN',
    }
  }

  let hasError = false

  // 1. Vérification Base de données
  try {
    await prisma.$executeRawUnsafe('SELECT 1')
    status.services.database = 'UP'
  } catch (error: any) {
    status.services.database = 'DOWN'
    status.services.databaseError = error.message || String(error)
    hasError = true
  }

  // 2. Vérification Redis
  try {
    await redis.get('health_ping')
    status.services.redis = 'UP'
  } catch (error: any) {
    status.services.redis = 'DOWN'
    status.services.redisError = error.message || String(error)
    hasError = true
  }

  if (hasError) {
    status.status = 'DEGRADED'
    return NextResponse.json(status, { status: 503 })
  }

  return NextResponse.json(status, { status: 200 })
}
