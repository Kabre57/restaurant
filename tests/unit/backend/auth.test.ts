// tests/unit/backend/auth.test.ts
// Test de l'authentification et du garde d'autorisation (RBAC) pour les Server Actions
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, assertSameStore } from "@/lib/auth-guard";
import { getServerSession } from "next-auth/next";

// Mock de next-auth/next
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

// Mock de l'objet de configuration authOptions
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

describe("Garde d'authentification (requireAuth et assertSameStore)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit lever une erreur si l'utilisateur n'est pas authentifié", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow("Non authentifié");
  });

  it("doit lever une erreur si le rôle de l'utilisateur est insuffisant", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: "user-1",
        role: "SERVER",
        storeId: "store-1",
        email: "server@test.com",
      },
    } as any);

    await expect(requireAuth(["ADMIN", "RESTAURATEUR"])).rejects.toThrow(
      "Accès non autorisé — rôle insuffisant"
    );
  });

  it("doit lever une erreur si l'utilisateur n'est pas associé à un store", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: "user-1",
        role: "ADMIN",
        storeId: null,
        email: "admin@test.com",
      },
    } as any);

    await expect(requireAuth()).rejects.toThrow(
      "Restaurant non associé à cet utilisateur"
    );
  });

  it("doit renvoyer le contexte de l'utilisateur si l'autorisation est valide", async () => {
    const mockUser = {
      id: "user-1",
      role: "RESTAURATEUR",
      storeId: "store-1",
      email: "rest@test.com",
    };
    vi.mocked(getServerSession).mockResolvedValue({ user: mockUser } as any);

    const context = await requireAuth(["RESTAURATEUR", "CASHIER"]);

    expect(context).toEqual({
      userId: "user-1",
      storeId: "store-1",
      role: "RESTAURATEUR",
      email: "rest@test.com",
    });
  });

  it("doit passer assertSameStore si les identifiants de store correspondent", () => {
    expect(() => assertSameStore("store-1", "store-1")).not.toThrow();
  });

  it("doit lever une erreur dans assertSameStore si les stores ne correspondent pas", () => {
    expect(() => assertSameStore("store-1", "store-2", "Commande")).toThrow(
      "Commande n'appartient pas à votre restaurant"
    );
  });
});
