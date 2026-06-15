import { logger } from "@/shared/logger";

export interface SecurityLogPayload {
  event: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  storeId?: string;
  userId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
}

/**
 * Logs a security event or anomaly.
 * Outputs to console (warning level) in structured JSON format for SIEM ingestion.
 */
export function logSecurity(payload: SecurityLogPayload): void {
  const isTest = process.env.NODE_ENV === "test";
  if (isTest) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    type: "SECURITY_LOG",
    ...payload,
  };

  // SIEM friendly structured output
  console.warn(JSON.stringify(logEntry));

  const prefix = `[SECURITY][${payload.severity}]`;
  logger.warn(
    `${prefix} Event: ${payload.event} | User: ${payload.userId || "unknown"} | Store: ${payload.storeId || "unknown"} | IP: ${payload.ipAddress || "unknown"}`
  );
}
