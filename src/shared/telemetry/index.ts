import { logAudit, AuditLogPayload } from "./audit";
import { logSecurity, SecurityLogPayload } from "./security";
import { logPerformance, measureExecution, PerformancePayload } from "./performance";

class TelemetryService {
  logAudit(payload: AuditLogPayload): void {
    // Fired asynchronously to avoid blocking execution threads
    void logAudit(payload);
  }

  logSecurity(payload: SecurityLogPayload): void {
    logSecurity(payload);
  }

  logPerformance(payload: PerformancePayload): void {
    logPerformance(payload);
  }

  async measureExecution<T>(
    metricName: string,
    context: { storeId?: string; userId?: string; details?: Record<string, any> },
    fn: () => Promise<T>
  ): Promise<T> {
    return measureExecution(metricName, context, fn);
  }
}

export const telemetry = new TelemetryService();
export default telemetry;

export { logAudit, logSecurity, logPerformance, measureExecution };
export type { AuditLogPayload, SecurityLogPayload, PerformancePayload };
