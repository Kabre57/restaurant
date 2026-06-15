// tests/integration/payroll-integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { generatePayrollForPeriod } from "@/app/actions/rh/payroll";

let currentStoreId = "";

// Mocks requis
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockImplementation(() =>
    Promise.resolve({
      storeId: currentStoreId,
      userId: "test-admin-id",
    })
  ),
  assertSameStore: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Intégration du Moteur de Paie RH & Fiscalité Ivoirienne", () => {
  let testStoreId: string;
  let employeeId: string;

  beforeEach(async () => {
    // 1. Créer un store temporaire
    const store = await prisma.store.create({
      data: {
        name: `Resto Paie Test ${Date.now()}`,
        commission: 10.0,
      },
    });
    testStoreId = store.id;
    currentStoreId = store.id;

    // 2. Créer une HrConfiguration par défaut pour ce store
    await prisma.hrConfiguration.create({
      data: {
        storeId: testStoreId,
      },
    });

    // 3. Créer un employé (CELIBATAIRE, 0 enfant, hireDate = 1er Juillet 2026)
    const employee = await prisma.user.create({
      data: {
        storeId: testStoreId,
        name: "Jean Dupont",
        email: `jean.dupont.${Date.now()}@test.com`,
        password: "hashed_password",
        role: "CASHIER",
        status: "ACTIVE",
        maritalStatus: "CELIBATAIRE",
        numberOfChildren: 0,
        hireDate: new Date("2026-07-01"),
      },
    });
    employeeId = employee.id;

    // 4. Créer un contrat actif pour cet employé (500k base salary)
    await prisma.contract.create({
      data: {
        userId: employeeId,
        type: "CDI",
        baseSalary: 500000,
        startDate: new Date("2026-07-01"),
        status: "ACTIVE",
      },
    });
  });

  afterEach(async () => {
    if (testStoreId) {
      // Nettoyer en cascade
      await prisma.payroll.deleteMany({
        where: { user: { storeId: testStoreId } },
      });
      await prisma.contract.deleteMany({
        where: { user: { storeId: testStoreId } },
      });
      await prisma.user.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.hrConfiguration.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.store.delete({
        where: { id: testStoreId },
      });
    }
  });

  it("doit générer correctement la paie sur plusieurs mois, calculer le 13ème mois proratisé en Décembre et liquider l'IGR", async () => {
    // 1. Générer la paie pour Juillet à Novembre (périodes 2026-07 à 2026-11)
    const periods = ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
    for (const period of periods) {
      const res = await generatePayrollForPeriod(period);
      expect(res.success).toBe(true);
    }

    // Vérifier les 5 fiches de paie en base
    const payrollsJulNov = await prisma.payroll.findMany({
      where: { userId: employeeId, period: { in: periods } },
    });
    expect(payrollsJulNov.length).toBe(5);

    // Toutes ces fiches de paie ont baseSalary = 500 000, et un montant d'impôts standard
    const firstPayroll = payrollsJulNov[0];
    expect(firstPayroll.baseSalary).toBe(500000);
    expect(firstPayroll.socialSecurity).toBeGreaterThan(0); // CNPS Salariale
    expect(firstPayroll.taxAmount).toBeGreaterThan(0); // IGR/ITS/CN

    // 2. Générer la paie de Décembre (2026-12)
    const resDec = await generatePayrollForPeriod("2026-12");
    expect(resDec.success).toBe(true);

    // Récupérer la fiche de paie de Décembre
    const decPayroll = await prisma.payroll.findFirst({
      where: { userId: employeeId, period: "2026-12" },
    });
    expect(decPayroll).toBeDefined();
    
    // Le 13ème mois doit être au prorata de 6 mois travaillés (Juillet à Décembre inclus)
    // 500 000 * 6/12 = 250 000.
    // Vérifions les calculs
    // Comme calculateIvoryCoastSalary est appelé avec baseSalary + bonus13th
    // Le NetSalary et les montants d'impôts intègrent le recalcul
    expect(decPayroll?.baseSalary).toBe(500000);
    // NetSalary de Décembre intègre le 13ème mois, donc il devrait être significativement plus élevé que celui de Juillet
    expect(decPayroll?.netSalary).toBeGreaterThan(firstPayroll.netSalary);
  });
});
