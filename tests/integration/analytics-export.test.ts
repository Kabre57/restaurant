// tests/integration/analytics-export.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "@/app/api/analytics/export/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";
import { getServerSession } from "next-auth/next";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...original,
    authOptions: {},
    checkUserStoreAccess: vi.fn().mockResolvedValue(true),
  };
});

describe("API Export Analytique - Tests d'Intégration", () => {
  let testStoreId: string;
  let categoryId: string;
  let productId: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Drop constraints temporaires si nécessaire pour éviter les conflits polymorphes
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "ProductIngredient" DROP CONSTRAINT IF EXISTS "ProductIngredient_subRecipe_fkey";');
      await prisma.$executeRawUnsafe('ALTER TABLE "ProductIngredient" DROP CONSTRAINT IF EXISTS "ProductIngredient_baseIngredient_fkey";');
    } catch (err) {
      // Ignorer silencieusement si absent ou non pris en charge
    }

    // 1. Créer un store de test
    const store = await prisma.store.create({
      data: {
        name: `Resto Export Test ${Date.now()}`,
        commission: 12.5,
      },
    });
    testStoreId = store.id;

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: "test-admin-id",
        role: "ADMIN",
        storeId: testStoreId,
        email: "admin@test.com",
      },
    } as any);

    // 2. Créer une catégorie de test
    const category = await prisma.category.create({
      data: {
        name: `Catégorie Export ${Date.now()}`,
        storeId: testStoreId,
      },
    });
    categoryId = category.id;

    // 3. Créer un produit de test
    const product = await prisma.product.create({
      data: {
        name: "Mock Item Export",
        price: 5000,
        categoryId: categoryId,
        storeId: testStoreId,
      },
    });
    productId = product.id;

    // 4. Créer une commande de test pour alimenter les statistiques
    await prisma.order.create({
      data: {
        storeId: testStoreId,
        status: "COMPLETED",
        total: 5000,
        items: {
          create: [
            { productId: productId, quantity: 1, price: 5000 },
          ],
        },
      },
    });
  });

  afterEach(async () => {
    if (testStoreId) {
      // Nettoyage de la base de données
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.order.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.product.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.category.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.store.delete({
        where: { id: testStoreId },
      });
    }
  });

  it("doit retourner un fichier Excel valide avec les en-têtes HTTP appropriés", async () => {
    const start = format(subDays(new Date(), 2), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");
    const url = `http://localhost/api/analytics/export?format=excel&startDate=${start}&endDate=${end}&storeId=${testStoreId}`;
    
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="rapport-analytique-');
    expect(res.headers.get("Content-Disposition")).toContain('.xlsx"');

    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  it("doit retourner un fichier PDF valide avec les en-têtes HTTP appropriés", async () => {
    const start = format(subDays(new Date(), 2), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");
    const url = `http://localhost/api/analytics/export?format=pdf&startDate=${start}&endDate=${end}&storeId=${testStoreId}`;
    
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="rapport-analytique-');
    expect(res.headers.get("Content-Disposition")).toContain('.pdf"');

    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  it("doit retourner une erreur 400 en cas de format invalide ou de paramètres requis manquants", async () => {
    // 1. Format invalide
    const urlFormat = `http://localhost/api/analytics/export?format=txt&startDate=2026-06-01&endDate=2026-06-10`;
    const reqFormat = new NextRequest(urlFormat);
    const resFormat = await GET(reqFormat);
    expect(resFormat.status).toBe(400);

    // 2. Dates invalides ou manquantes
    const urlDates = `http://localhost/api/analytics/export?format=excel&startDate=invalid-date`;
    const reqDates = new NextRequest(urlDates);
    const resDates = await GET(reqDates);
    expect(resDates.status).toBe(400);
  });

  it("doit retourner 401 si non authentifie", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const start = format(subDays(new Date(), 2), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");
    const url = `http://localhost/api/analytics/export?format=excel&startDate=${start}&endDate=${end}&storeId=${testStoreId}`;
    const req = new NextRequest(url);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("doit retourner 403 si role insuffisant", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: "test-server-id",
        role: "SERVER",
        storeId: testStoreId,
        email: "server@test.com",
      },
    } as any);
    const start = format(subDays(new Date(), 2), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");
    const url = `http://localhost/api/analytics/export?format=excel&startDate=${start}&endDate=${end}&storeId=${testStoreId}`;
    const req = new NextRequest(url);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
