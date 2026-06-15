import { logger } from "@/shared/logger";

export interface PerformancePayload {
  metricName: string;
  durationMs: number;
  storeId?: string;
  userId?: string;
  details?: Record<string, any>;
}

/**
 * Logs a performance metric.
 */
export function logPerformance(payload: PerformancePayload): void {
  const isTest = process.env.NODE_ENV === "test";
  if (isTest) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    type: "PERFORMANCE_LOG",
    ...payload,
  };

  console.info(JSON.stringify(logEntry));
  
  if (payload.durationMs > 500) {
    logger.warn(`[PERF][SLOW] ${payload.metricName} took ${payload.durationMs}ms`);
  }
}

/**
 * Helper to measure execution time of async functions.
 */
export async function measureExecution<T>(
  metricName: string,
  context: { storeId?: string; userId?: string; details?: Record<string, any> },
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    logPerformance({
      metricName,
      durationMs,
      ...context,
    });
  }
}
