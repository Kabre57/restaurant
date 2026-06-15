// tests/unit/backend/ingredient.test.ts
// Test CRUD des ingrédients et gestion de l'inventaire associé

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createIngredient, updateInventory, deleteInventory } from "@/app/actions/inventory/inventory";
import { prisma } from "@/infrastructure/prisma/client";
import { requireAuth, assertSameStore } from "@/lib/auth-guard";

// Mocks
vi.mock("@/infrastructure/prisma/client", () => ({
  prisma: {
    ingredient: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    inventory: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn(),
  assertSameStore: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Gestion des Ingrédients et de l'Inventaire - Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createIngredient", () => {
    it("doit créer un ingrédient et l'ajouter à l'inventaire s'il n'existe pas", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      // L'ingrédient n'existe pas en DB
      vi.mocked(prisma.ingredient.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.ingredient.create).mockResolvedValue({
        id: "ing-1",
        name: "Farine",
        unit: "kg",
        storeId: "store-1",
      } as any);

      // L'inventaire n'existe pas non plus pour cet ingrédient
      vi.mocked(prisma.inventory.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.inventory.create).mockResolvedValue({
        id: "inv-1",
        storeId: "store-1",
        ingredientId: "ing-1",
        quantity: 50,
        minStock: 10,
      } as any);

      const result = await createIngredient({
        storeId: "store-1",
        name: "Farine",
        unit: "kg",
        quantity: 50,
        minStock: 10,
      });

      expect(result.success).toBe(true);
      expect(prisma.ingredient.create).toHaveBeenCalled();
      expect(prisma.inventory.create).toHaveBeenCalledWith({
        data: {
          storeId: "store-1",
          ingredientId: "ing-1",
          quantity: 50,
          minStock: 10,
        },
      });
    });

    it("doit renvoyer une erreur si l'ingrédient est déjà présent dans l'inventaire", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      // L'ingrédient existe déjà
      vi.mocked(prisma.ingredient.findFirst).mockResolvedValue({
        id: "ing-1",
        name: "Farine",
        storeId: "store-1",
      } as any);

      // L'inventaire existe déjà
      vi.mocked(prisma.inventory.findUnique).mockResolvedValue({
        id: "inv-1",
        storeId: "store-1",
        ingredientId: "ing-1",
      } as any);

      const result = await createIngredient({
        storeId: "store-1",
        name: "Farine",
        unit: "kg",
        quantity: 50,
        minStock: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cet ingrédient existe déjà dans l'inventaire du restaurant.");
    });
  });

  describe("updateInventory", () => {
    it("doit mettre à jour les stocks de l'inventaire", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      vi.mocked(prisma.inventory.findUnique).mockResolvedValue({
        id: "inv-1",
        storeId: "store-1",
        quantity: 10,
      } as any);

      vi.mocked(prisma.inventory.update).mockResolvedValue({
        id: "inv-1",
        quantity: 30,
        minStock: 5,
      } as any);

      const result = await updateInventory("inv-1", 30, 5);

      expect(assertSameStore).toHaveBeenCalledWith("store-1", "store-1");
      expect(result.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalled();
    });
  });

  describe("deleteInventory", () => {
    it("doit supprimer l'élément de l'inventaire", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        role: "RESTAURATEUR",
        userId: "user-1",
        email: "user@test.com",
      });

      vi.mocked(prisma.inventory.findUnique).mockResolvedValue({
        id: "inv-1",
        storeId: "store-1",
      } as any);

      const result = await deleteInventory("inv-1");

      expect(result.success).toBe(true);
      expect(prisma.inventory.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
    });
  });
});
