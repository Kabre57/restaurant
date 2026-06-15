// tests/unit/backend/store.test.ts
// Test de la gestion des magasins (getStoreDetails, getStores, createStore) et de l'isolation multi-tenant

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStoreDetails, getStores, createStore } from "@/app/actions/store/stores";
import { prisma } from "@/lib/db";
import { requireAuth, assertSameStore } from "@/lib/auth-guard";
import bcrypt from "bcryptjs";

// Mock des dépendances
vi.mock("@/lib/db", () => ({
  prisma: {
    store: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn(),
  assertSameStore: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_pwd"),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Service Magasins (Stores) - Multi-tenant & CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStoreDetails", () => {
    it("doit autoriser l'accès si l'utilisateur appartient au même store", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        id: "store-1",
        name: "Resto Test",
      } as any);

      const result = await getStoreDetails("store-1");

      expect(assertSameStore).toHaveBeenCalledWith("store-1", "store-1");
      expect(result?.name).toBe("Resto Test");
    });

    it("doit refuser l'accès si l'utilisateur est d'un autre store", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-2",
        role: "RESTAURATEUR",
        userId: "user-2",
        email: "user2@test.com",
      });

      vi.mocked(assertSameStore).mockImplementation(() => {
        throw new Error("Ressource n'appartient pas à votre restaurant");
      });

      await expect(getStoreDetails("store-1")).rejects.toThrow(
        "Ressource n'appartient pas à votre restaurant"
      );
    });

    it("doit autoriser un ADMIN à voir n'importe quel store sans verifier assertSameStore", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-2",
        role: "ADMIN",
        userId: "user-admin",
        email: "admin@test.com",
      });

      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        id: "store-1",
        name: "Resto Test",
      } as any);

      const result = await getStoreDetails("store-1");

      expect(assertSameStore).not.toHaveBeenCalled();
      expect(result?.name).toBe("Resto Test");
    });
  });

  describe("getStores", () => {
    it("doit interdire l'accès aux non-admins", async () => {
      vi.mocked(requireAuth).mockImplementation(() => {
        throw new Error("Accès non autorisé — rôle insuffisant");
      });

      await expect(getStores()).rejects.toThrow("Accès non autorisé — rôle insuffisant");
    });

    it("doit renvoyer la liste des stores pour l'admin", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "ADMIN",
        userId: "user-admin",
        email: "admin@test.com",
      });
      vi.mocked(prisma.store.findMany).mockResolvedValue([
        { id: "store-1", name: "Resto A" },
      ] as any);

      const result = await getStores();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Resto A");
    });
  });

  describe("createStore", () => {
    it("doit interdire la création de restaurant si non-admin", async () => {
      vi.mocked(requireAuth).mockImplementation(() => {
        throw new Error("Accès non autorisé — rôle insuffisant");
      });

      await expect(
        createStore({
          name: "Nouveau Resto",
          managerName: "Chef",
          managerEmail: "chef@test.com",
          managerPassword: "pwd",
        })
      ).rejects.toThrow("Accès non autorisé — rôle insuffisant");
    });

    it("doit renvoyer une erreur si l'email du manager existe déjà", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "ADMIN",
        userId: "user-admin",
        email: "admin@test.com",
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as any);

      const result = await createStore({
        name: "Nouveau Resto",
        managerName: "Chef",
        managerEmail: "chef@test.com",
        managerPassword: "pwd",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cet email manager existe déjà.");
    });

    it("doit créer le store et le compte manager avec succès", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "ADMIN",
        userId: "user-admin",
        email: "admin@test.com",
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.store.create).mockResolvedValue({
        id: "store-new",
        name: "Nouveau Resto",
      } as any);

      const result = await createStore({
        name: "Nouveau Resto",
        managerName: "Chef",
        managerEmail: "chef@test.com",
        managerPassword: "pwd",
      });

      expect(result.success).toBe(true);
      expect(result.store?.id).toBe("store-new");
      expect(prisma.store.create).toHaveBeenCalled();
    });
  });
});
