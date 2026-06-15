import { prisma } from "@/lib/db";
import { logger } from "@/shared/logger";

export interface AuditLogPayload {
  storeId: string;
  userId: string;
  action: string;
  description?: string;
  oldValue?: any;
  newValue?: any;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Logs a sensitive business audit event.
 * Outputs to structured JSON (stdout/stderr) and persists to DB in the UserHistory table.
 */
export async function logAudit(payload: AuditLogPayload): Promise<void> {
  const isTest = process.env.NODE_ENV === "test";

  // 1. Structured log output for log collectors (e.g. ELK, Datadog)
  if (!isTest) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "AUDIT_LOG",
      ...payload,
    };
    console.info(JSON.stringify(logEntry));
    logger.info(`[AUDIT] Action: ${payload.action} by User: ${payload.userId} in Store: ${payload.storeId}`);
  }

  // 2. Database persistence for business historical records
  try {
    await prisma.userHistory.create({
      data: {
        userId: payload.userId,
        action: payload.action,
        description: payload.description || `${payload.action} effectuée par l'utilisateur.`,
        metadata: {
          storeId: payload.storeId,
          oldValue: payload.oldValue !== undefined ? payload.oldValue : null,
          newValue: payload.newValue !== undefined ? payload.newValue : null,
          details: payload.details ?? {},
          ipAddress: payload.ipAddress || null,
        },
      },
    });
  } catch (error) {
    // Graceful handling to ensure audit logging errors do not crash business flows
    logger.error("Erreur lors de la persistance de l'audit log dans la base de données:", error);
  }
}
