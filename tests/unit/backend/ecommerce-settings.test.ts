import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEcommerceSettings, updateEcommerceSettings } from "@/app/actions/settings/ecommerce";
import { prisma } from "@/lib/db";
import { assertSameStore, requireAuth } from "@/lib/auth-guard";

vi.mock("@/lib/db", () => ({
  prisma: {
    store: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

const settingsRecord = {
  ecommerceEnabled: true,
  deliveryEnabled: true,
  clickAndCollectEnabled: true,
  deliveryFee: "1500",
  preparationDelayMinutes: 45,
  closedDates: ["2026-12-25"],
};

describe("Actions paramètres e-commerce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: "user-1",
      storeId: "store-1",
      role: "RESTAURATEUR",
      email: "chef@test.com",
    });
  });

  it("retourne une configuration normalisée pour le restaurant courant", async () => {
    vi.mocked(prisma.store.findUnique).mockResolvedValue(settingsRecord as never);

    const result = await getEcommerceSettings("store-1");

    expect(assertSameStore).toHaveBeenCalledWith("store-1", "store-1", "Paramètres e-commerce");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.settings.deliveryFee).toBe(1500);
      expect(result.settings.closedDates).toEqual(["2026-12-25"]);
    }
  });

  it("refuse d'ouvrir la boutique sans mode de commande actif", async () => {
    const result = await updateEcommerceSettings("store-1", {
      ecommerceEnabled: true,
      deliveryEnabled: false,
      clickAndCollectEnabled: false,
      deliveryFee: 0,
      preparationDelayMinutes: 30,
      closedDates: [],
    });

    expect(result.success).toBe(false);
    expect(prisma.store.update).not.toHaveBeenCalled();
  });

  it("désactive les frais si la livraison est coupée", async () => {
    vi.mocked(prisma.store.update).mockResolvedValue({
      ...settingsRecord,
      deliveryEnabled: false,
      deliveryFee: "0",
    } as never);

    const result = await updateEcommerceSettings("store-1", {
      ecommerceEnabled: true,
      deliveryEnabled: false,
      clickAndCollectEnabled: true,
      deliveryFee: 2500,
      preparationDelayMinutes: 30,
      closedDates: ["2026-12-25", "2026-12-25"],
    });

    expect(result.success).toBe(true);
    expect(prisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryFee: 0,
          closedDates: ["2026-12-25"],
        }),
      })
    );
  });

  it("applique l'isolation multi-tenant pour les non-admins", async () => {
    vi.mocked(assertSameStore).mockImplementation(() => {
      throw new Error("Paramètres e-commerce n'appartient pas à votre restaurant");
    });

    const result = await getEcommerceSettings("store-2");

    expect(result.success).toBe(false);
    expect(prisma.store.findUnique).not.toHaveBeenCalled();
  });
});
