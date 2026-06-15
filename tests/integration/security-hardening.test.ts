import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { checkUserStoreAccess } from "@/lib/auth";

// Import route handlers
import { GET as getReservations, POST as postReservations } from "@/app/api/booking/reservations/route";
import { GET as getTables } from "@/app/api/booking/tables/route";
import { PATCH as patchReservationStatus } from "@/app/api/booking/reservations/[id]/status/route";
import { GET as getDeliveryOrders, POST as postDeliveryOrders } from "@/app/api/delivery/orders/route";
import { PATCH as patchDeliveryOrderStatus } from "@/app/api/delivery/orders/[id]/status/route";
import { GET as getAnalyticsDashboard } from "@/app/api/analytics/dashboard/route";
import { GET as getAnalyticsExport } from "@/app/api/analytics/export/route";
import { GET as getPosAlerts } from "@/app/api/pos/alerts/route";
import { GET as getStockAlerts } from "@/app/api/stock/alerts/route";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...original,
    authOptions: {},
    checkUserStoreAccess: vi.fn(),
  };
});

vi.mock("@/lib/redis", () => ({
  redis: {
    duplicate: () => ({
      subscribe: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
      unsubscribe: vi.fn().mockResolvedValue(null),
      disconnect: vi.fn(),
    }),
  },
}));

describe("Security Hardening & Multi-Tenant Isolation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Requirements (401 Unauthorized)", () => {
    it("should deny access to GET /api/booking/reservations without session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/booking/reservations");
      const res = await getReservations(req);
      expect(res.status).toBe(401);
    });

    it("should deny access to GET /api/booking/tables without session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/booking/tables");
      const res = await getTables(req);
      expect(res.status).toBe(401);
    });

    it("should deny access to GET /api/delivery/orders without session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/delivery/orders");
      const res = await getDeliveryOrders(req);
      expect(res.status).toBe(401);
    });

    it("should deny access to GET /api/analytics/dashboard without session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/analytics/dashboard");
      const res = await getAnalyticsDashboard(req);
      expect(res.status).toBe(401);
    });

    it("should deny access to GET /api/analytics/export without session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/analytics/export?format=excel&startDate=2026-06-01&endDate=2026-06-10");
      const res = await getAnalyticsExport(req);
      expect(res.status).toBe(401);
    });

    it("should deny access to GET /api/pos/alerts SSE without session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/pos/alerts?storeId=store-1");
      const res = await getPosAlerts(req);
      expect(res.status).toBe(401);
    });

    it("should deny access to GET /api/stock/alerts SSE without session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/stock/alerts?storeId=store-1");
      const res = await getStockAlerts(req);
      expect(res.status).toBe(401);
    });
  });

  describe("Role & Store Authorization Requirements (403 Forbidden)", () => {
    it("should deny access to GET /api/analytics/dashboard for SERVER role", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-1", role: "SERVER", storeId: "store-1" },
      } as any);
      const req = new NextRequest("http://localhost/api/analytics/dashboard");
      const res = await getAnalyticsDashboard(req);
      expect(res.status).toBe(403);
    });

    it("should deny access to GET /api/booking/reservations if tenant check fails", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-1", role: "CASHIER", storeId: "store-1" },
      } as any);
      vi.mocked(checkUserStoreAccess).mockResolvedValue(false);

      const req = new NextRequest("http://localhost/api/booking/reservations?storeId=store-2");
      const res = await getReservations(req);
      expect(res.status).toBe(403);
    });

    it("should deny access to GET /api/delivery/orders if tenant check fails", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-1", role: "DELIVERY", storeId: "store-1" },
      } as any);
      vi.mocked(checkUserStoreAccess).mockResolvedValue(false);

      const req = new NextRequest("http://localhost/api/delivery/orders?storeId=store-2");
      const res = await getDeliveryOrders(req);
      expect(res.status).toBe(403);
    });

    it("should deny access to GET /api/pos/alerts SSE if tenant check fails", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-1", role: "SERVER", storeId: "store-1" },
      } as any);
      vi.mocked(checkUserStoreAccess).mockResolvedValue(false);

      const req = new NextRequest("http://localhost/api/pos/alerts?storeId=store-2");
      const res = await getPosAlerts(req);
      expect(res.status).toBe(403);
    });

    it("should deny access to GET /api/stock/alerts SSE if tenant check fails", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u-1", role: "SERVER", storeId: "store-1" },
      } as any);
      vi.mocked(checkUserStoreAccess).mockResolvedValue(false);

      const req = new NextRequest("http://localhost/api/stock/alerts?storeId=store-2");
      const res = await getStockAlerts(req);
      expect(res.status).toBe(403);
    });
  });
});
