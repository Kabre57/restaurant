// tests/integration/analytics-integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { AnalyticsService } from "@/services/analytics.service";
import { startOfDay, endOfDay, subDays } from "date-fns";

describe("Intégration du Tableau de Bord Analytique & Calculs Marges / Conversions", () => {
  let testStoreId: string;
  let categoryId: string;
  let productId1: string;
  let productId2: string;
  let ingredientId1: string;
  let ingredientId2: string;

  beforeEach(async () => {
    // Drop the constraints if they exist so database doesn't complain about polymorphic references
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "ProductIngredient" DROP CONSTRAINT IF EXISTS "ProductIngredient_subRecipe_fkey";');
      await prisma.$executeRawUnsafe('ALTER TABLE "ProductIngredient" DROP CONSTRAINT IF EXISTS "ProductIngredient_baseIngredient_fkey";');
    } catch (err) {
      console.warn("Could not drop constraints in test:", err);
    }

    // 1. Create temporary store
    const store = await prisma.store.create({
      data: {
        name: `Resto Analytics Test ${Date.now()}`,
        commission: 10.0,
      },
    });
    testStoreId = store.id;

    // 2. Create category
    const category = await prisma.category.create({
      data: {
        name: `Catégorie Test ${Date.now()}`,
        storeId: testStoreId,
      },
    });
    categoryId = category.id;

    // 3. Create ingredients (cost of raw materials)
    const ing1 = await prisma.ingredient.create({
      data: {
        name: "Pain burger",
        unit: "PIECE",
        costPrice: 200, // 200 FCFA
        storeId: testStoreId,
      },
    });
    ingredientId1 = ing1.id;

    const ing2 = await prisma.ingredient.create({
      data: {
        name: "Steak haché",
        unit: "PIECE",
        costPrice: 400, // 400 FCFA
        storeId: testStoreId,
      },
    });
    ingredientId2 = ing2.id;

    // 4. Create products
    // Burger (selling price = 2000, cost = pain (200) + steak (400) = 600, expected margin = 1400 / 70%)
    const prod1 = await prisma.product.create({
      data: {
        name: "Le Big Burger Test",
        price: 2000,
        categoryId: categoryId,
        storeId: testStoreId,
        ingredients: {
          create: [
            { ingredientId: ingredientId1, quantity: 1, unit: "PIECE" },
            { ingredientId: ingredientId2, quantity: 1, unit: "PIECE" },
          ],
        },
      },
    });
    productId1 = prod1.id;

    // Soda (selling price = 1000, cost = 0 (no ingredients defined), expected margin = 1000 / 100%)
    const prod2 = await prisma.product.create({
      data: {
        name: "Soda Glacé Test",
        price: 1000,
        categoryId: categoryId,
        storeId: testStoreId,
      },
    });
    productId2 = prod2.id;
  });

  afterEach(async () => {
    if (testStoreId) {
      // Clean up database
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: testStoreId } },
      });
      await prisma.order.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.reservation.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.table.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.productIngredient.deleteMany({
        where: { product: { storeId: testStoreId } },
      });
      await prisma.product.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.ingredient.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.category.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.consolidatedReport.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.store.delete({
        where: { id: testStoreId },
      });
    }
  });

  it("doit calculer correctement le chiffre d'affaires, les marges avec ingrédients et les conversions de réservations", async () => {
    // 1. Create some orders
    // Order 1: 2 Burgers, 1 Soda, 2 guests (total = 5000)
    const order1 = await prisma.order.create({
      data: {
        storeId: testStoreId,
        status: "COMPLETED",
        total: 5000,
        items: {
          create: [
            { productId: productId1, quantity: 2, price: 2000 },
            { productId: productId2, quantity: 1, price: 1000 },
          ],
        },
      },
    });

    // Order 2: 1 Burger, 1 guest (total = 2000)
    const order2 = await prisma.order.create({
      data: {
        storeId: testStoreId,
        status: "COMPLETED",
        total: 2000,
        items: {
          create: [
            { productId: productId1, quantity: 1, price: 2000 },
          ],
        },
      },
    });

    // 2. Create tables and reservations to verify conversion rate
    const table = await prisma.table.create({
      data: {
        storeId: testStoreId,
        number: 10,
        capacity: 4,
        status: "AVAILABLE",
      },
    });

    // Confirmed reservation (converted)
    await prisma.reservation.create({
      data: {
        storeId: testStoreId,
        tableId: table.id,
        customerName: "Alice",
        phone: "01020304",
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        guests: 2,
        status: "CONFIRMED",
      },
    });

    // Seated reservation (converted)
    await prisma.reservation.create({
      data: {
        storeId: testStoreId,
        tableId: table.id,
        customerName: "Bob",
        phone: "05060708",
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        guests: 4,
        status: "SEATED",
      },
    });

    // Cancelled reservation (not converted)
    await prisma.reservation.create({
      data: {
        storeId: testStoreId,
        tableId: table.id,
        customerName: "Charlie",
        phone: "09090909",
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        guests: 2,
        status: "CANCELLED",
      },
    });

    // 3. Run dashboard analytics calculation
    const report = await AnalyticsService.getDashboard({
      startDate: startOfDay(subDays(new Date(), 1)),
      endDate: endOfDay(new Date()),
      storeId: testStoreId,
      period: "day",
    });

    // Verify KPIs
    expect(report.kpis.totalRevenue).toBe(7000); // 5000 + 2000
    expect(report.kpis.totalOrders).toBe(2);
    expect(report.kpis.averageOrderValue).toBe(3500); // 7000 / 2

    // Verify Reservation Conversion Rate
    // Converted = CONFIRMED, SEATED (2 reservations)
    // Total = CONFIRMED, SEATED, CANCELLED (3 reservations)
    // Rate = 2 / 3 = 66.666%
    expect(report.kpis.reservationConversionRate).toBeCloseTo(66.67, 1);

    // Verify Top Products margins
    // Burger: quantity = 3, revenue = 6000, costPrice = 600, marginAmount = 2000 - 600 = 1400 per burger. Total margin = 3 * 1400 = 4200. Margin % = (1400 / 2000) * 100 = 70%
    const burgerStat = report.topProducts.find((p) => p.name === "Le Big Burger Test");
    expect(burgerStat).toBeDefined();
    expect(burgerStat?.quantitySold).toBe(3);
    expect(burgerStat?.revenue).toBe(6000);
    expect(burgerStat?.costPrice).toBe(600);
    expect(burgerStat?.marginAmount).toBe(4200);
    expect(burgerStat?.marginPercent).toBeCloseTo(70, 1);

    // Soda: quantity = 1, revenue = 1000, costPrice = 0, marginAmount = 1000. Margin % = 100%
    const sodaStat = report.topProducts.find((p) => p.name === "Soda Glacé Test");
    expect(sodaStat).toBeDefined();
    expect(sodaStat?.quantitySold).toBe(1);
    expect(sodaStat?.revenue).toBe(1000);
    expect(sodaStat?.costPrice).toBe(0);
    expect(sodaStat?.marginAmount).toBe(1000);
    expect(sodaStat?.marginPercent).toBeCloseTo(100, 1);
  });
});
