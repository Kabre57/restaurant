import { logger } from '@/shared/logger';

export interface AuditLogPayload {
  storeId: string;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}

class TelemetryService {
  private isTest = process.env.NODE_ENV === 'test';

  logAudit(payload: AuditLogPayload): void {
    if (this.isTest) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT_LOG',
      ...payload
    };

    // Outputs structured JSON for easy log aggregation/ingestion
    console.info(JSON.stringify(logEntry));

    // Also notify standard logger at info level for human readability
    logger.info(`[AUDIT] Action: ${payload.action} by User: ${payload.userId} in Store: ${payload.storeId}`);
  }
}

export const telemetry = new TelemetryService();
export default telemetry;
