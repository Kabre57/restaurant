// tests/unit/backend/multi-store-transfer.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { StockTransferService } from "@/services/stock-transfer.service"
import { prisma } from "@/lib/db"

vi.mock("@/lib/db", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    stockTransfer: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}))

describe("StockTransferService - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createTransferRequest", () => {
    it("doit jeter une erreur si la quantité est inférieure ou égale à 0", async () => {
      await expect(
        StockTransferService.createTransferRequest({
          fromStoreId: "store-a",
          toStoreId: "store-b",
          productId: "prod-1",
          quantity: 0,
        })
      ).rejects.toThrow("La quantité à transférer doit être supérieure à 0.")
    })

    it("doit jeter une erreur si les stores source et destination sont identiques", async () => {
      await expect(
        StockTransferService.createTransferRequest({
          fromStoreId: "store-a",
          toStoreId: "store-a",
          productId: "prod-1",
          quantity: 5,
        })
      ).rejects.toThrow("L'établissement de départ et d'arrivée doivent être différents.")
    })

    it("doit jeter une erreur si le produit source n'existe pas", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null)

      await expect(
        StockTransferService.createTransferRequest({
          fromStoreId: "store-a",
          toStoreId: "store-b",
          productId: "prod-nonexistent",
          quantity: 5,
        })
      ).rejects.toThrow("Produit source introuvable.")
    })

    it("doit jeter une erreur si le produit source n'appartient pas à l'établissement source", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        storeId: "store-other",
      } as any)

      await expect(
        StockTransferService.createTransferRequest({
          fromStoreId: "store-a",
          toStoreId: "store-b",
          productId: "prod-1",
          quantity: 5,
        })
      ).rejects.toThrow("Le produit n'appartient pas à l'établissement source.")
    })

    it("doit jeter une erreur si le produit n'a pas de code-barres", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        storeId: "store-a",
        barcode: null,
      } as any)

      await expect(
        StockTransferService.createTransferRequest({
          fromStoreId: "store-a",
          toStoreId: "store-b",
          productId: "prod-1",
          quantity: 5,
        })
      ).rejects.toThrow("Le produit n'a pas de code-barres configuré.")
    })

    it("doit jeter une erreur si le stock d'origine est insuffisant", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        storeId: "store-a",
        barcode: "123456789",
        trackStock: true,
        stockQuantity: 2,
      } as any)

      await expect(
        StockTransferService.createTransferRequest({
          fromStoreId: "store-a",
          toStoreId: "store-b",
          productId: "prod-1",
          quantity: 5,
        })
      ).rejects.toThrow("Stock insuffisant dans l'établissement source")
    })

    it("doit jeter une erreur si aucun produit avec le même code-barres n'est trouvé dans le magasin cible", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        storeId: "store-a",
        barcode: "123456789",
        trackStock: true,
        stockQuantity: 10,
      } as any)

      vi.mocked(prisma.product.findFirst).mockResolvedValue(null)

      await expect(
        StockTransferService.createTransferRequest({
          fromStoreId: "store-a",
          toStoreId: "store-b",
          productId: "prod-1",
          quantity: 5,
        })
      ).rejects.toThrow("Aucun produit correspondant avec le même code-barres n'a été trouvé dans l'établissement de destination.")
    })

    it("doit créer la demande de transfert si toutes les validations réussissent", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-1",
        storeId: "store-a",
        barcode: "123456789",
        trackStock: true,
        stockQuantity: 10,
      } as any)

      vi.mocked(prisma.product.findFirst).mockResolvedValue({
        id: "prod-2",
        storeId: "store-b",
        barcode: "123456789",
      } as any)

      vi.mocked(prisma.stockTransfer.create).mockResolvedValue({
        id: "transfer-123",
        fromStoreId: "store-a",
        toStoreId: "store-b",
        productId: "prod-1",
        quantity: 5,
        status: "PENDING",
      } as any)

      const transfer = await StockTransferService.createTransferRequest({
        fromStoreId: "store-a",
        toStoreId: "store-b",
        productId: "prod-1",
        quantity: 5,
        notes: "Urgents",
      })

      expect(prisma.stockTransfer.create).toHaveBeenCalledWith({
        data: {
          fromStoreId: "store-a",
          toStoreId: "store-b",
          productId: "prod-1",
          quantity: 5,
          status: "PENDING",
          notes: "Urgents",
        },
        include: {
          product: true,
          fromStore: true,
          toStore: true,
        },
      })
      expect(transfer.id).toBe("transfer-123")
    })
  })

  describe("updateTransferStatus", () => {
    it("doit rejeter la demande sans modifier les stocks", async () => {
      vi.mocked(prisma.stockTransfer.findUnique).mockResolvedValue({
        id: "transfer-1",
        status: "PENDING",
        productId: "prod-1",
        quantity: 5,
        fromStoreId: "store-a",
        toStoreId: "store-b",
      } as any)

      vi.mocked(prisma.stockTransfer.update).mockResolvedValue({
        id: "transfer-1",
        status: "REJECTED",
      } as any)

      const result = await StockTransferService.updateTransferStatus("transfer-1", "REJECTED", "user-admin")

      expect(prisma.stockTransfer.update).toHaveBeenCalledWith({
        where: { id: "transfer-1" },
        data: { status: "REJECTED", completedAt: expect.any(Date) },
        include: expect.any(Object),
      })
      expect(prisma.product.update).not.toHaveBeenCalled()
      expect(result.status).toBe("REJECTED")
    })

    it("doit décrémenter le stock source et incrémenter le stock destination lors de l'approbation", async () => {
      vi.mocked(prisma.stockTransfer.findUnique).mockResolvedValue({
        id: "transfer-1",
        status: "PENDING",
        productId: "prod-source",
        quantity: 3,
        fromStoreId: "store-a",
        toStoreId: "store-b",
        fromStore: { name: "Store A" },
        toStore: { name: "Store B" },
      } as any)

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "prod-source",
        barcode: "barcode-🍔",
        trackStock: true,
        stockQuantity: 10,
      } as any)

      vi.mocked(prisma.product.findFirst).mockResolvedValue({
        id: "prod-target",
        barcode: "barcode-🍔",
        trackStock: true,
      } as any)

      vi.mocked(prisma.stockTransfer.update).mockResolvedValue({
        id: "transfer-1",
        status: "APPROVED",
      } as any)

      const result = await StockTransferService.updateTransferStatus("transfer-1", "APPROVED", "user-admin")

      // Check decrements and increments
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: "prod-source" },
        data: { stockQuantity: { decrement: 3 } },
      })
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: "prod-target" },
        data: { stockQuantity: { increment: 3 } },
      })

      // Check movements logging
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: "prod-source",
          storeId: "store-a",
          quantity: -3,
          reason: "TRANSFER_OUT",
          referenceId: "transfer-1",
          note: "Transfert sortant #SFER-1 vers Store B",
        },
      })
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: "prod-target",
          storeId: "store-b",
          quantity: 3,
          reason: "TRANSFER_IN",
          referenceId: "transfer-1",
          note: "Transfert entrant #SFER-1 depuis Store A",
        },
      })

      expect(result.status).toBe("APPROVED")
    })
  })
})
