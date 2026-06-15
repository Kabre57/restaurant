// tests/unit/backend/product.test.ts
// Test CRUD des produits et gestion du cache Redis associé

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProduct, updateProduct, deleteProduct, getProductsByStore } from "@/app/actions/catalog/products";
import { prisma } from "@/lib/db";
import { requireAuth, assertSameStore } from "@/lib/auth-guard";
import { redis, getCached } from "@/lib/redis";

// Mocks
vi.mock("@/lib/db", () => ({
  prisma: {
    product: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn(),
  assertSameStore: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    del: vi.fn(),
  },
  getCached: vi.fn((key, ttl, cb) => cb()),
  REDIS_KEYS: {
    products: (storeId: string) => `products:${storeId}`,
  },
}));

describe("Gestion des Produits (Catalog/Products) - Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createProduct", () => {
    it("doit créer un produit et purger le cache du magasin", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      const mockProduct = { id: "prod-1", name: "Pizza", price: 15.0 };
      vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as any);

      const result = await createProduct({
        name: "Pizza Margherita",
        price: 1500, // FCFA
        categoryId: "cat-1",
        storeId: "store-1",
        averagePrepTimeMins: 10,
        trackStock: false,
      });

      expect(result.success).toBe(true);
      expect(result.product).toEqual(mockProduct);
      expect(prisma.product.create).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith("products:store-1");
    });
  });

  describe("updateProduct", () => {
    it("doit mettre à jour le produit si autorisé et purger le cache", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        storeId: "store-1",
        name: "Old Pizza",
      } as any);

      const mockUpdated = { id: "prod-1", name: "New Pizza", storeId: "store-1" };
      vi.mocked(prisma.product.update).mockResolvedValue(mockUpdated as any);

      const result = await updateProduct("prod-1", {
        name: "New Pizza",
      });

      expect(assertSameStore).toHaveBeenCalledWith("store-1", "store-1", "Produit");
      expect(result.success).toBe(true);
      expect(result.product).toEqual(mockUpdated);
      expect(redis.del).toHaveBeenCalledWith("products:store-1");
    });

    it("doit renvoyer une erreur si le produit n'existe pas", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const result = await updateProduct("prod-1", { name: "NonExistent" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Produit non trouvé");
    });
  });

  describe("deleteProduct", () => {
    it("doit supprimer le produit et purger le cache", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        storeId: "store-1",
      } as any);
      vi.mocked(prisma.product.delete).mockResolvedValue({
        id: "prod-1",
        storeId: "store-1",
      } as any);

      const result = await deleteProduct("prod-1");

      expect(result.success).toBe(true);
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: "prod-1" } });
      expect(redis.del).toHaveBeenCalledWith("products:store-1");
    });
  });

  describe("getProductsByStore", () => {
    it("doit renvoyer les produits filtrés par magasin", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "CASHIER",
        userId: "user-1",
        email: "user@test.com",
      });
      const mockList = [{ id: "prod-1", name: "Pizza" }];
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockList as any);

      const result = await getProductsByStore("store-1");
      expect(result).toEqual(mockList);
    });
  });
});
