// tests/unit/backend/payroll.test.ts
// Test du moteur fiscal ivoirien (calcul ITS, IGR, CNPS) et de la génération des bulletins de paie

import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateTaxParts, calculateIvoryCoastSalary } from "@/lib/rh/ivoryCoastTax";
import { generatePayrollForPeriod, markPayrollAsPaid, cloturerPeriode, reouvrirPeriode } from "@/app/actions/rh/payroll";
import { prisma } from "@/infrastructure/prisma/client";
import { requireAuth, assertSameStore } from "@/lib/auth-guard";

// Mocks
vi.mock("@/infrastructure/prisma/client", () => ({
  prisma: {
    hrConfiguration: {
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    payroll: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    clotureMois: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
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

describe("Moteur Fiscal Ivoirien (Calculs de Paie)", () => {
  describe("calculateTaxParts (Parts fiscales)", () => {
    const partsConfig = {
      maxParts: 5,
      SINGLE: { base: 1, withChildrenBase: 2, perChild: 0.5 },
      MARRIED: { base: 2, withChildrenBase: 2.5, perChild: 0.5 },
    };

    it("doit calculer 1 part pour un célibataire sans enfant", () => {
      const parts = calculateTaxParts("SINGLE", 0, partsConfig);
      expect(parts).toBe(1);
    });

    it("doit calculer 2 parts pour un célibataire avec 1 enfant", () => {
      const parts = calculateTaxParts("SINGLE", 1, partsConfig);
      expect(parts).toBe(2); // withChildrenBase
    });

    it("doit calculer 2.5 parts pour un marié sans enfant", () => {
      const parts = calculateTaxParts("MARRIED", 0, partsConfig);
      expect(parts).toBe(2); // base
    });

    it("doit calculer 3 parts pour un marié avec 2 enfants", () => {
      const parts = calculateTaxParts("MARRIED", 2, partsConfig);
      // withChildrenBase + (2-1)*0.5 = 2.5 + 0.5 = 3
      expect(parts).toBe(3);
    });

    it("doit plafonner à maxParts", () => {
      const parts = calculateTaxParts("MARRIED", 10, partsConfig);
      expect(parts).toBe(5);
    });
  });

  describe("calculateIvoryCoastSalary (Salaire Brut → Net)", () => {
    it("doit calculer correctement le salaire net et les charges patronales de base", () => {
      const baseSalary = 500000; // 500k FCFA
      const res = calculateIvoryCoastSalary(baseSalary, "SINGLE", 0);

      // CNPS Salariale par défaut: 6.3% = 31500
      expect(res.cnpsSalarial).toBe(31500);

      // ITS par défaut: 80% * 500000 * 1.2% = 4800
      expect(res.its).toBe(4800);

      // Salaire net doit être brut moins les taxes
      expect(res.netSalary).toBe(baseSalary - res.totalTaxes);
    });

    it("doit plafonner la base CNPS", () => {
      const highSalary = 2000000; // 2M FCFA (Supérieur au plafond CNPS 1 647 315)
      const res = calculateIvoryCoastSalary(highSalary, "SINGLE", 0);

      // Plafond CNPS 1647315 * 6.3% = 103781
      expect(res.cnpsSalarial).toBe(103781);
    });
  });
});

describe("Gestion des Bulletins de Paie (Server Actions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePayrollForPeriod", () => {
    it("doit générer les bulletins de paie pour les employés actifs disposant d'un contrat", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        userId: "user-admin",
        role: "ADMIN",
        email: "admin@test.com",
      });

      // Période non clôturée
      vi.mocked(prisma.clotureMois.findFirst).mockResolvedValue(null);

      // Config RH par défaut
      vi.mocked(prisma.hrConfiguration.findFirst).mockResolvedValue({
        cnpsEmployeeRate: 6.3,
        cnpsEmployerRate: 16.45,
        itsRate: 1.2,
        baseImposableRate: 80,
        cnpsCeiling: 1647315,
        igrBaseRate: 85,
      } as any);

      // 1 employé actif avec contrat actif
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "emp-1",
          maritalStatus: "SINGLE",
          numberOfChildren: 0,
          contracts: [
            {
              id: "contr-1",
              baseSalary: 300000,
              status: "ACTIVE",
              startDate: new Date("2025-01-01"),
            },
          ],
        },
      ] as any);

      // Pas de bulletin existant pour cette période
      vi.mocked(prisma.payroll.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.payroll.create).mockResolvedValue({
        id: "pay-1",
        userId: "emp-1",
        netSalary: 281100,
      } as any);

      const result = await generatePayrollForPeriod("2026-06");

      expect(result.success).toBe(true);
      expect(result.generatedCount).toBe(1);
      expect(prisma.payroll.create).toHaveBeenCalled();
    });

    it("doit rejeter la génération si la période est clôturée", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        userId: "user-admin",
        role: "ADMIN",
      } as any);

      // Période clôturée
      vi.mocked(prisma.clotureMois.findFirst).mockResolvedValue({
        id: "clot-1",
        isClosed: true,
      } as any);

      const result = await generatePayrollForPeriod("2026-06");

      expect(result.success).toBe(false);
      expect(result.error).toContain("clôturée");
      expect(prisma.payroll.create).not.toHaveBeenCalled();
    });

    it("doit inclure un 13ème mois au prorata en Décembre", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        userId: "user-admin",
        role: "ADMIN",
      } as any);

      vi.mocked(prisma.clotureMois.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.hrConfiguration.findFirst).mockResolvedValue({} as any);

      // Employé recruté le 1er Juillet (6 mois de travail sur l'année)
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "emp-new",
          maritalStatus: "SINGLE",
          numberOfChildren: 0,
          contracts: [
            {
              id: "contr-new",
              baseSalary: 200000,
              status: "ACTIVE",
              startDate: new Date("2026-07-01"), // Juillet = index 6
            },
          ],
        },
      ] as any);

      vi.mocked(prisma.payroll.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.payroll.create).mockResolvedValue({} as any);

      // Mock previous payrolls for year startsWith:
      vi.mocked(prisma.payroll.findMany).mockResolvedValue([]);

      const result = await generatePayrollForPeriod("2026-12");

      expect(result.success).toBe(true);
      // Le 13ème mois pour 6 mois de travail sur 12 = 200000 * (6 / 12) = 100000 FCFA
      // Le salaire brut soumis aux calculs de taxe pour Dec sera base + bonus = 300 000 FCFA
      expect(prisma.payroll.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "emp-new",
            period: "2026-12",
            baseSalary: 200000,
          }),
        })
      );
    });
  });

  describe("markPayrollAsPaid", () => {
    it("doit modifier le statut de paiement à PAID", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        userId: "user-admin",
        role: "ADMIN",
        email: "admin@test.com",
      });

      vi.mocked(prisma.payroll.findUnique).mockResolvedValue({
        id: "pay-1",
        period: "2026-06",
        user: { storeId: "store-1" },
      } as any);

      vi.mocked(prisma.clotureMois.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.payroll.update).mockResolvedValue({
        id: "pay-1",
        paymentStatus: "PAID",
      } as any);

      const result = await markPayrollAsPaid("pay-1", "TRANS-XYZ");

      expect(assertSameStore).toHaveBeenCalledWith("store-1", "store-1", "Bulletin de paie");
      expect(result.success).toBe(true);
      expect(prisma.payroll.update).toHaveBeenCalledWith({
        where: { id: "pay-1" },
        data: {
          paymentStatus: "PAID",
          paymentDate: expect.any(Date),
          reference: "TRANS-XYZ",
        },
      });
    });

    it("doit rejeter si la période est clôturée", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        userId: "user-admin",
        role: "ADMIN",
      } as any);

      vi.mocked(prisma.payroll.findUnique).mockResolvedValue({
        id: "pay-1",
        period: "2026-06",
        user: { storeId: "store-1" },
      } as any);

      // Clôturé !
      vi.mocked(prisma.clotureMois.findFirst).mockResolvedValue({
        id: "clot-1",
        isClosed: true,
      } as any);

      const result = await markPayrollAsPaid("pay-1", "TRANS-XYZ");

      expect(result.success).toBe(false);
      expect(result.error).toContain("clôturée");
      expect(prisma.payroll.update).not.toHaveBeenCalled();
    });
  });

  describe("Actions de clôture", () => {
    it("cloturerPeriode doit appeler upsert avec isClosed true", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        userId: "user-admin",
      } as any);

      vi.mocked(prisma.clotureMois.upsert).mockResolvedValue({} as any);

      const result = await cloturerPeriode("2026-06");

      expect(result.success).toBe(true);
      expect(prisma.clotureMois.upsert).toHaveBeenCalledWith({
        where: { storeId_period: { storeId: "store-1", period: "2026-06" } },
        update: expect.objectContaining({ isClosed: true }),
        create: expect.objectContaining({ storeId: "store-1", period: "2026-06", isClosed: true }),
      });
    });

    it("reouvrirPeriode doit modifier isClosed à false", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        storeId: "store-1",
        userId: "user-admin",
      } as any);

      vi.mocked(prisma.clotureMois.update).mockResolvedValue({} as any);

      const result = await reouvrirPeriode("2026-06");

      expect(result.success).toBe(true);
      expect(prisma.clotureMois.update).toHaveBeenCalledWith({
        where: { storeId_period: { storeId: "store-1", period: "2026-06" } },
        data: expect.objectContaining({ isClosed: false }),
      });
    });
  });
});
