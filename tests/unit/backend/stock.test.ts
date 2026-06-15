// tests/unit/backend/stock.test.ts
// Test de la déduction de stock sur commande, fiches techniques et alertes de rupture

import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRecipeAvailability, deductRecipeIngredients } from "@/app/actions/inventory/inventory";
import { Prisma } from "@prisma/client";

describe("Logique de Déduction et Alerte de Stock (Recette/Ingrédients)", () => {
  let mockTx: any;

  beforeEach(() => {
    // Créer un mock complet pour la transaction Prisma
    mockTx = {
      productIngredient: {
        findMany: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      inventory: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      ingredientMovement: {
        create: vi.fn(),
      },
    };
  });

  describe("checkRecipeAvailability", () => {
    it("doit renvoyer success=true si tous les ingrédients de la recette sont en quantité suffisante", async () => {
      // Produit avec 1 ingrédient requis: 200g de Farine
      mockTx.productIngredient.findMany.mockResolvedValue([
        {
          productId: "prod-1",
          ingredientId: "ing-1",
          quantity: 200,
          isSubRecipe: false,
          ingredientBase: { name: "Farine", unit: "g" },
        },
      ]);

      // Stock en inventaire: 500g
      mockTx.inventory.findUnique.mockResolvedValue({
        quantity: 500,
      });

      const res = await checkRecipeAvailability(mockTx, "store-1", "prod-1", 1);

      expect(res.success).toBe(true);
      expect(mockTx.inventory.findUnique).toHaveBeenCalled();
    });

    it("doit lever une alerte / erreur si le stock d'un ingrédient est insuffisant", async () => {
      // Produit avec 200g de Farine
      mockTx.productIngredient.findMany.mockResolvedValue([
        {
          productId: "prod-1",
          ingredientId: "ing-1",
          quantity: 200,
          isSubRecipe: false,
          ingredientBase: { name: "Farine", unit: "g" },
        },
      ]);

      // Stock en inventaire: seulement 100g
      mockTx.inventory.findUnique.mockResolvedValue({
        quantity: 100,
      });

      const res = await checkRecipeAvailability(mockTx, "store-1", "prod-1", 1);

      expect(res.success).toBe(false);
      expect(res.error).toContain("Stock insuffisant pour l'ingrédient 'Farine'");
    });
  });

  describe("deductRecipeIngredients", () => {
    it("doit déduire la bonne quantité et enregistrer le mouvement de stock pour traçabilité", async () => {
      // Produit avec 200g de Farine
      mockTx.productIngredient.findMany.mockResolvedValue([
        {
          productId: "prod-1",
          ingredientId: "ing-1",
          quantity: 200,
          isSubRecipe: false,
        },
      ]);

      // Stock en inventaire initial: 500g
      mockTx.inventory.findUnique.mockResolvedValue({
        id: "inv-1",
        quantity: 500,
      });

      await deductRecipeIngredients(mockTx, "store-1", "prod-1", 2, "Vente");

      // Vérifie la soustraction: 500 - (200 * 2) = 100g restant
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: {
          quantity: 100,
          lastUpdated: expect.any(Date),
        },
      });

      // Vérifie la création du log de mouvement
      expect(mockTx.ingredientMovement.create).toHaveBeenCalledWith({
        data: {
          storeId: "store-1",
          ingredientId: "ing-1",
          quantity: -400, // 200g * 2 quantité commandée
          reason: "ADJUSTMENT_CORRECTION",
          note: "Vente",
        },
      });
    });
  });
});
