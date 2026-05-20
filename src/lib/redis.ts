import Redis from 'ioredis';

// Singleton for Redis client to avoid multiple connections during HMR in dev
const globalForRedis = global as unknown as { redis?: Redis };

function createRedisClient() {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

  client.on('error', (error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Redis connection error:', error.message);
    }
  });

  return client;
}

export const redis = globalForRedis.redis || createRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
