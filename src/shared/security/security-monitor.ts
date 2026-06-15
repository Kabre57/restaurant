import { redis } from "@/lib/redis";
import { logSecurity } from "@/shared/telemetry/security";
import { logger } from "@/shared/logger";

const MEMORY_CACHE = new Map<string, { count: number; expiresAt: number }>();

async function incrementAndCheck(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const redisKey = `sec-monitor:${key}`;
    const count = await redis.incr(redisKey);
    let ttl = await redis.ttl(redisKey);

    if (count === 1 || ttl === -1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return count > limit;
  } catch (err) {
    logger.warn("Redis issue in SecurityMonitor, falling back to local memory cache:", err);
    
    // In-memory fallback
    const now = Date.now();
    let cached = MEMORY_CACHE.get(key);
    if (!cached || cached.expiresAt < now) {
      cached = { count: 0, expiresAt: now + windowSeconds * 1000 };
    }
    cached.count += 1;
    MEMORY_CACHE.set(key, cached);
    return cached.count > limit;
  }
}

export class SecurityMonitor {
  /**
   * Tracks failed access attempts (Access Denied).
   * Triggers a CRITICAL security alert if 10 failed attempts occur within 5 minutes.
   */
  static async trackAccessDenied(
    userId: string,
    storeId: string,
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const key = `access-denied:${userId || ipAddress || "unknown"}`;
    const breached = await incrementAndCheck(key, 10, 300);

    if (breached) {
      logSecurity({
        event: "MULTIPLE_ACCESS_DENIED",
        severity: "CRITICAL",
        storeId,
        userId,
        ipAddress,
        details: {
          limit: 10,
          windowSeconds: 300,
          ...details,
        },
      });
    }
  }

  /**
   * Tracks unauthorized refund attempts.
   * Triggers a CRITICAL security alert if 20 unauthorized refund attempts occur within 5 minutes.
   */
  static async trackUnauthorizedRefund(
    userId: string,
    storeId: string,
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const key = `unauthorized-refund:${userId}`;
    const breached = await incrementAndCheck(key, 20, 300);

    if (breached) {
      logSecurity({
        event: "REFUND_SPAM_DETECTED",
        severity: "CRITICAL",
        storeId,
        userId,
        ipAddress,
        details: {
          limit: 20,
          windowSeconds: 300,
          ...details,
        },
      });
    }
  }

  /**
   * Tracks cross-store access attempt.
   * Alerts immediately on any attempt.
   */
  static trackCrossStoreAccess(
    userId: string,
    userStoreId: string,
    targetStoreId: string,
    ipAddress?: string,
    details?: Record<string, any>
  ): void {
    logSecurity({
      event: "CROSS_STORE_LEAK_BLOCKED",
      severity: "CRITICAL",
      storeId: targetStoreId,
      userId,
      ipAddress,
      details: {
        userStoreId,
        targetStoreId,
        ...details,
      },
    });
  }
}
export default SecurityMonitor;
