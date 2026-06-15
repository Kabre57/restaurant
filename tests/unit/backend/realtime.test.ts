// tests/unit/backend/realtime.test.ts
// Test de la publication des notifications Redis Pub/Sub (KDS, alertes de stock et alertes de caisse)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishStockAlert, publishOrderEvent, publishPOSOrderAlert } from "@/app/actions/orders/orderNotifications";
import { redis } from "@/lib/redis";
import { requireAuth, assertSameStore } from "@/lib/auth-guard";

// Mocks
vi.mock("@/lib/redis", () => ({
  redis: {
    publish: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn(),
  assertSameStore: vi.fn(),
}));

describe("Moteur Notifications Temps Réel (Redis Pub/Sub)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("publishStockAlert", () => {
    it("doit publier une alerte de rupture de stock sur le bon canal Redis", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      const product = { name: "Poulet Croustillant", stockQuantity: 2 };
      await publishStockAlert("store-1", product);

      expect(assertSameStore).toHaveBeenCalledWith("store-1", "store-1");
      expect(redis.publish).toHaveBeenCalledWith(
        "store:store-1:stock-alert",
        JSON.stringify(product)
      );
    });
  });

  describe("publishOrderEvent", () => {
    it("doit publier l'événement de commande au KDS", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "CASHIER",
        userId: "user-1",
        email: "user@test.com",
      });

      const mockOrder = { id: "order-1", storeId: "store-1", total: 4500 };
      await publishOrderEvent("new-order", mockOrder);

      expect(redis.publish).toHaveBeenCalledWith(
        "store:store-1:orders:new-order",
        JSON.stringify(mockOrder)
      );
    });
  });

  describe("publishPOSOrderAlert", () => {
    it("doit formater et publier l'alerte POS_ORDER_ALERT sur le canal pos-alerts", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "SERVER",
        userId: "user-1",
        email: "user@test.com",
      });

      const mockOrderPayload = {
        id: "order-2",
        storeId: "store-1",
        table: { number: 4 },
        total: 10000,
      };

      await publishPOSOrderAlert("ORDER_READY", mockOrderPayload);

      expect(redis.publish).toHaveBeenCalledWith(
        "store:store-1:pos-alerts",
        expect.stringContaining('"type":"ORDER_READY"')
      );
      expect(redis.publish).toHaveBeenCalledWith(
        "store:store-1:pos-alerts",
        expect.stringContaining('"orderId":"order-2"')
      );
      expect(redis.publish).toHaveBeenCalledWith(
        "store:store-1:pos-alerts",
        expect.stringContaining('"tableNumber":4')
      );
    });
  });
});
