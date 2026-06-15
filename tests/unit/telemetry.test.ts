import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { telemetry } from '@/shared/telemetry';

describe('TelemetryService', () => {
  let consoleInfoSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('should output a structured JSON to console.info', () => {
    const payload = {
      storeId: 'store-123',
      userId: 'user-456',
      action: 'ORDER_REFUNDED',
      details: { orderId: 'ord-abc', amount: 5000 }
    };

    telemetry.logAudit(payload);

    expect(consoleInfoSpy).toHaveBeenCalled();
    const printedString = consoleInfoSpy.mock.calls[0][0];
    const parsedLog = JSON.parse(printedString);

    expect(parsedLog.type).toBe('AUDIT_LOG');
    expect(parsedLog.storeId).toBe('store-123');
    expect(parsedLog.userId).toBe('user-456');
    expect(parsedLog.action).toBe('ORDER_REFUNDED');
    expect(parsedLog.details.orderId).toBe('ord-abc');
    expect(parsedLog.timestamp).toBeDefined();
  });
});
