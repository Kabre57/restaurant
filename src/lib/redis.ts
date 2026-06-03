// src/lib/redis.ts
// Client Redis avec fallback en mémoire si ioredis n'est pas installé

import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────
export interface RedisLike {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  // ── BUG-001 FIX : méthodes requises par le rate limiter ──
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  // ── Méthodes Redis standard utilisées par SSE et sub-manager ──
  duplicate(): RedisLike;
  disconnect(): void;
  // ─────────────────────────────────────────────────────────
  publish(channel: string, message: string): Promise<unknown>;
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): this;
  del(key: string): Promise<number>;
}

// ─── Fallback en mémoire (si Redis non dispo) ────────────
const memStore  = new Map<string, string>();
const memExpiry = new Map<string, number>(); // timestamp ms d'expiration
const memSubs   = new Map<string, Array<(ch: string, msg: string) => void>>();

/** Vérifie l'expiration d'une clé et la supprime si échue */
function memCheckExpiry(key: string): void {
  const expiresAt = memExpiry.get(key);
  if (expiresAt !== undefined && Date.now() > expiresAt) {
    memStore.delete(key);
    memExpiry.delete(key);
  }
}

const memClient: RedisLike = {
  async get(key) {
    memCheckExpiry(key);
    return memStore.get(key) ?? null;
  },
  async setex(key, ttl, val) {
    memStore.set(key, val);
    memExpiry.set(key, Date.now() + ttl * 1000);
    return "OK";
  },
  // ── BUG-001 FIX : implémentation incr/expire/ttl ────────
  async incr(key) {
    memCheckExpiry(key);
    const current = parseInt(memStore.get(key) ?? '0', 10);
    const next = current + 1;
    memStore.set(key, String(next));
    return next;
  },
  async expire(key, seconds) {
    if (!memStore.has(key)) return 0;
    memExpiry.set(key, Date.now() + seconds * 1000);
    return 1;
  },
  async ttl(key) {
    memCheckExpiry(key);
    if (!memStore.has(key)) return -2; // clé inexistante (convention Redis)
    const expiresAt = memExpiry.get(key);
    if (expiresAt === undefined) return -1; // pas d'expiration
    return Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
  },
  // ─────────────────────────────────────────────────────────
  async publish(channel, msg)  { (memSubs.get(channel) ?? []).forEach((fn) => fn(channel, msg)); return 1; },
  async subscribe(channel)     { if (!memSubs.has(channel)) memSubs.set(channel, []); return "OK"; },
  async unsubscribe(channel)   { memSubs.delete(channel); return "OK"; },
  // duplicate() en fallback mémoire retourne soi-même (connexion unique partagée)
  duplicate()                  { return memClient; },
  disconnect()                 { /* no-op en mode mémoire */ },
  on(_event: string, _listener: (...args: unknown[]) => void): RedisLike { return memClient; },
  async del(key) {
    if (memStore.has(key)) {
      memStore.delete(key);
      memExpiry.delete(key);
      return 1;
    }
    return 0;
  },
};

// ─── Chargement dynamique d'ioredis ──────────────────────
function tryLoadRedis(): RedisLike {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    const url   = process.env.REDIS_URL ?? "redis://localhost:6379";
    const client = new Redis(url, { maxRetriesPerRequest: 2, enableReadyCheck: false, lazyConnect: true });
    client.on("error", (err: Error) => {
      if (process.env.NODE_ENV !== "production")
        logger.warn("[Redis] non-fatal:", err.message);
    });
    return client;
  } catch {
    logger.info("[Redis] ioredis not found — using in-memory fallback");
    return memClient;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __redis: RedisLike | undefined;
  // eslint-disable-next-line no-var
  var __redisPub: RedisLike | undefined;
  // eslint-disable-next-line no-var
  var __redisSub: RedisLike | undefined;
}

export const redis:    RedisLike = global.__redis    ?? (global.__redis    = tryLoadRedis());
export const redisPub: RedisLike = global.__redisPub ?? (global.__redisPub = tryLoadRedis());
export const redisSub: RedisLike = global.__redisSub ?? (global.__redisSub = tryLoadRedis());

// ─── Helpers clés ────────────────────────────────────────
export const REDIS_KEYS = {
  tables:      (restaurantId: string) => `restaurant:${restaurantId}:tables`,
  table:       (id: string)           => `table:${id}`,
  tableEvents: (restaurantId: string) => `restaurant:${restaurantId}:table-events`,
  products:    (restaurantId: string) => `restaurant:${restaurantId}:products`,
  stats:       (restaurantId: string) => `restaurant:${restaurantId}:stats`,
} as const;

export const REDIS_CHANNELS = {
  tableUpdated: (restaurantId: string) => `table-updated:${restaurantId}`,
} as const;

/**
 * Fonction utilitaire pour mettre en cache des requêtes lourdes.
 * @param key Clé Redis unique
 * @param ttl Durée de vie en secondes
 * @param fetchFn Fonction de récupération des données si le cache est vide
 */
export async function getCached<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    logger.warn(`[Redis] Erreur de lecture du cache pour la clé ${key}:`, error);
  }

  const data = await fetchFn();

  try {
    if (data !== undefined && data !== null) {
      await redis.setex(key, ttl, JSON.stringify(data));
    }
  } catch (error) {
    logger.warn(`[Redis] Erreur d'écriture du cache pour la clé ${key}:`, error);
  }

  return data;
}
