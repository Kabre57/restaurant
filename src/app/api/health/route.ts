import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

type ServiceStatus = 'UP' | 'DOWN'

interface HealthStatus {
  status: 'UP' | 'DEGRADED'
  timestamp: string
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    databaseError?: string
    redisError?: string
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function GET() {
  const status: HealthStatus = {
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
  } catch (error: unknown) {
    status.services.database = 'DOWN'
    status.services.databaseError = getErrorMessage(error)
    hasError = true
  }

  // 2. Vérification Redis
  try {
    await redis.get('health_ping')
    status.services.redis = 'UP'
  } catch (error: unknown) {
    status.services.redis = 'DOWN'
    status.services.redisError = getErrorMessage(error)
    hasError = true
  }

  if (hasError) {
    status.status = 'DEGRADED'
    return NextResponse.json(status, { status: 503 })
  }

  return NextResponse.json(status, { status: 200 })
}
