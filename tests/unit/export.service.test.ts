// tests/unit/export.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportService, ExportFilters } from "@/services/export.service";
import { DashboardReport } from "@/services/analytics.service";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      reservation: {
        findMany: vi.fn(),
      },
      store: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe("ExportService - Unit Tests", () => {
  const mockReport: DashboardReport = {
    kpis: {
      totalRevenue: 150000,
      totalOrders: 10,
      averageOrderValue: 15000,
      totalGuests: 20,
      reservationConversionRate: 80,
    },
    revenueChart: [
      { label: "2026-06-01", revenue: 50000, ordersCount: 3 },
      { label: "2026-06-02", revenue: 100000, ordersCount: 7 },
    ],
    topProducts: [
      {
        id: "prod-1",
        name: "Burger Gourmand",
        quantitySold: 15,
        revenue: 90000,
        costPrice: 2000,
        marginAmount: 60000,
        marginPercent: 66.6,
      },
      {
        id: "prod-2",
        name: "Frites Maison",
        quantitySold: 20,
        revenue: 60000,
        costPrice: 500,
        marginAmount: 50000,
        marginPercent: 83.3,
      },
    ],
    marginProducts: [
      {
        id: "prod-1",
        name: "Burger Gourmand",
        sellingPrice: 6000,
        costPrice: 2000,
        marginAmount: 4000,
        marginPercent: 66.6,
      },
    ],
  };

  const filters: ExportFilters = {
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-10"),
    storeId: "store-test-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a valid multi-sheet Excel file with 5 expected sheets", async () => {
    // Mock database response for reservations (fréquentation)
    vi.mocked(prisma.reservation.findMany).mockResolvedValue([
      {
        id: "res-1",
        storeId: "store-test-123",
        tableId: "table-1",
        customerName: "Jean Dupont",
        phone: "01020304",
        date: new Date("2026-06-05"),
        startTime: new Date("2026-06-05T19:30:00Z"),
        endTime: new Date("2026-06-05T21:30:00Z"),
        guests: 4,
        status: "CONFIRMED",
        createdAt: new Date(),
        updatedAt: new Date(),
        email: null,
      },
    ]);

    const buffer = await ExportService.generateExcel(mockReport, filters);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Read back workbook to verify worksheets structure
    const workbook = XLSX.read(buffer, { type: "buffer" });
    expect(workbook.SheetNames).toContain("CA par jour");
    expect(workbook.SheetNames).toContain("Top produits (quantité)");
    expect(workbook.SheetNames).toContain("Top produits (CA)");
    expect(workbook.SheetNames).toContain("Marges par produit");
    expect(workbook.SheetNames).toContain("Fréquentation (couverts)");

    // Inspect the first sheet (CA par jour) data row count
    const wsCa = workbook.Sheets["CA par jour"];
    const wsCaJson = XLSX.utils.sheet_to_json(wsCa);
    expect(wsCaJson.length).toBe(2); // 2 revenue points
  });

  it("should generate a valid PDF report with correct page count", async () => {
    vi.mocked(prisma.store.findUnique).mockResolvedValue({
      id: "store-test-123",
      name: "Chez l'Africain",
      commission: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    vi.mocked(prisma.reservation.findMany).mockResolvedValue([]);

    const buffer = await ExportService.generatePdf(mockReport, filters);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // The PDF signature starts with %PDF
    const signature = buffer.toString("utf8", 0, 4);
    expect(signature).toBe("%PDF");
  });
});
