import { redis } from '@/lib/redis'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetSeconds: number
}

export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redisKey = `rate-limit:${key}`
  const count = await redis.incr(redisKey)

  if (count === 1) {
    await redis.expire(redisKey, windowSeconds)
  }

  const ttl = await redis.ttl(redisKey)
  return {
    allowed: count <= limit,
    remaining: Math.max(limit - count, 0),
    resetSeconds: ttl > 0 ? ttl : windowSeconds,
  }
}

export function rateLimitKey(scope: string, req: Request, suffix?: string) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')
  const ip = forwardedFor || realIp || 'unknown'
  return [scope, ip, suffix].filter(Boolean).join(':')
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.resetSeconds),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  )
}
