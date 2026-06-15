import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { telemetry } from '@/shared/telemetry';

describe('TelemetryService', () => {
  let consoleInfoSpy: any;

  beforeEach(() => {
    // Temporarily mock NODE_ENV or force telemetry behavior by overriding its private properties/methods if needed,
    // or just spy on console.info.
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    // Force isTest to false temporarily to execute the logging code
    (telemetry as any).isTest = false;
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    (telemetry as any).isTest = process.env.NODE_ENV === 'test';
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
