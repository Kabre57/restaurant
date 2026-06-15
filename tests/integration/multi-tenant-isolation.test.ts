// tests/integration/multi-tenant-isolation.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma } from "@/lib/db"
import { checkUserStoreAccess } from "@/lib/auth"
import { StockTransferService } from "@/services/stock-transfer.service"
import { ConsolidatedService } from "@/services/consolidated.service"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"

describe("Architecture Multi-Store & Isolation Multi-Tenant - Tests d'Intégration", () => {
  let storeAId: string
  let storeBId: string
  let storeCId: string // Unrelated store to test strict isolation
  
  let catAId: string
  let catBId: string
  let catCId: string

  let prodAId: string
  let prodBId: string
  let prodCId: string

  let employeeId: string
  let managerId: string
  let adminId: string

  beforeEach(async () => {
    // 1. Create temporary stores
    const storeA = await prisma.store.create({ data: { name: `Store A Test ${Date.now()}` } })
    const storeB = await prisma.store.create({ data: { name: `Store B Test ${Date.now()}` } })
    const storeC = await prisma.store.create({ data: { name: `Store C Test ${Date.now()}` } })
    storeAId = storeA.id
    storeBId = storeB.id
    storeCId = storeC.id

    // 2. Create Categories
    const catA = await prisma.category.create({ data: { name: "Burger", storeId: storeAId } })
    const catB = await prisma.category.create({ data: { name: "Burger", storeId: storeBId } })
    const catC = await prisma.category.create({ data: { name: "Burger", storeId: storeCId } })
    catAId = catA.id
    catBId = catB.id
    catCId = catC.id

    // 3. Create Products with identical barcodes in A, B, C
    const prodA = await prisma.product.create({
      data: {
        name: "Burger POS A",
        price: 2500,
        barcode: "BARCODE-TEST-999",
        trackStock: true,
        stockQuantity: 20,
        categoryId: catAId,
        storeId: storeAId,
      },
    })
    const prodB = await prisma.product.create({
      data: {
        name: "Burger POS B",
        price: 2500,
        barcode: "BARCODE-TEST-999",
        trackStock: true,
        stockQuantity: 5,
        categoryId: catBId,
        storeId: storeBId,
      },
    })
    const prodC = await prisma.product.create({
      data: {
        name: "Burger POS C",
        price: 2500,
        barcode: "BARCODE-TEST-999",
        trackStock: true,
        stockQuantity: 100,
        categoryId: catCId,
        storeId: storeCId,
      },
    })
    prodAId = prodA.id
    prodBId = prodB.id
    prodCId = prodC.id

    // 4. Create Users
    const hashed = await bcrypt.hash("password123", 10)
    
    // Employee: linked only to Store A
    const employee = await prisma.user.create({
      data: {
        name: "Employé A",
        email: `emp.a.${Date.now()}@test.com`,
        password: hashed,
        role: Role.STORE_EMPLOYEE,
        storeId: storeAId,
      },
    })
    employeeId = employee.id

    // Manager: Primary store A, auxiliary store B (can switch between A and B, but NOT C)
    const manager = await prisma.user.create({
      data: {
        name: "Manager Multi-Store",
        email: `mgr.ab.${Date.now()}@test.com`,
        password: hashed,
        role: Role.STORE_MANAGER,
        storeId: storeAId,
        stores: {
          connect: [{ id: storeBId }],
        },
      },
    })
    managerId = manager.id

    // Super Admin: Has central access to all stores
    const admin = await prisma.user.create({
      data: {
        name: "Super Administrateur Central",
        email: `admin.central.${Date.now()}@test.com`,
        password: hashed,
        role: Role.SUPER_ADMIN,
        storeId: storeAId,
      },
    })
    adminId = admin.id
  })

  afterEach(async () => {
    // Cleanup of created entities
    const testStoreIds = [storeAId, storeBId, storeCId].filter(Boolean)

    if (testStoreIds.length > 0) {
      await prisma.stockMovement.deleteMany({
        where: { storeId: { in: testStoreIds } },
      })
      await prisma.stockTransfer.deleteMany({
        where: { OR: [{ fromStoreId: { in: testStoreIds } }, { toStoreId: { in: testStoreIds } }] },
      })
      await prisma.consolidatedReport.deleteMany({
        where: { storeId: { in: testStoreIds } },
      })
      await prisma.product.deleteMany({
        where: { storeId: { in: testStoreIds } },
      })
      await prisma.category.deleteMany({
        where: { storeId: { in: testStoreIds } },
      })
      await prisma.user.deleteMany({
        where: { id: { in: [employeeId, managerId, adminId].filter(Boolean) } },
      })
      await prisma.store.deleteMany({
        where: { id: { in: testStoreIds } },
      })
    }
  })

  describe("Validation des Droits et Multi-tenant (checkUserStoreAccess)", () => {
    it("doit isoler l'employé à son magasin principal uniquement", async () => {
      // Employé a accès à Store A
      const hasAccessA = await checkUserStoreAccess(employeeId, Role.STORE_EMPLOYEE, storeAId)
      expect(hasAccessA).toBe(true)

      // Employé n'a pas accès à Store B
      const hasAccessB = await checkUserStoreAccess(employeeId, Role.STORE_EMPLOYEE, storeBId)
      expect(hasAccessB).toBe(false)
    })

    it("doit permettre au manager d'accéder à ses magasins associés", async () => {
      // Manager a accès à son store principal (Store A)
      const hasAccessA = await checkUserStoreAccess(managerId, Role.STORE_MANAGER, storeAId)
      expect(hasAccessA).toBe(true)

      // Manager a accès à son store secondaire associé (Store B)
      const hasAccessB = await checkUserStoreAccess(managerId, Role.STORE_MANAGER, storeBId)
      expect(hasAccessB).toBe(true)

      // Manager n'a PAS accès au magasin tiers non affecté (Store C)
      const hasAccessC = await checkUserStoreAccess(managerId, Role.STORE_MANAGER, storeCId)
      expect(hasAccessC).toBe(false)
    })

    it("doit accorder un accès complet au Super Admin central", async () => {
      // Admin a accès à Store C même sans liaison explicite
      const hasAccessC = await checkUserStoreAccess(adminId, Role.SUPER_ADMIN, storeCId)
      expect(hasAccessC).toBe(true)
    })
  })

  describe("Transfert de stock inter-sites et Isolation", () => {
    it("doit transférer le stock uniquement entre les deux magasins ciblés sans affecter les autres", async () => {
      // 1. Créer une demande de transfert de 5 unités de Store A vers Store B
      const transfer = await StockTransferService.createTransferRequest({
        fromStoreId: storeAId,
        toStoreId: storeBId,
        productId: prodAId,
        quantity: 5,
        notes: "Test d'intégration transfert",
      })

      expect(transfer.status).toBe("PENDING")

      // 2. Approuver le transfert (déclenche les transactions et écritures de stocks)
      const approvedTransfer = await StockTransferService.updateTransferStatus(
        transfer.id,
        "APPROVED",
        adminId
      )

      expect(approvedTransfer.status).toBe("APPROVED")

      // 3. Vérifier les stocks mis à jour
      const updatedProdA = await prisma.product.findUnique({ where: { id: prodAId } })
      const updatedProdB = await prisma.product.findUnique({ where: { id: prodBId } })
      const updatedProdC = await prisma.product.findUnique({ where: { id: prodCId } })

      // Store A: décrémenté de 5 (20 -> 15)
      expect(updatedProdA?.stockQuantity).toBe(15)

      // Store B: incrémenté de 5 (5 -> 10)
      expect(updatedProdB?.stockQuantity).toBe(10)

      // Store C: non affecté, reste à 100 (isolation stricte)
      expect(updatedProdC?.stockQuantity).toBe(100)

      // 4. Vérifier la création des mouvements de stock correspondants
      const movements = await prisma.stockMovement.findMany({
        where: { referenceId: transfer.id },
      })
      expect(movements).toHaveLength(2)

      const outMovement = movements.find(m => m.storeId === storeAId)
      const inMovement = movements.find(m => m.storeId === storeBId)

      expect(outMovement).toBeDefined()
      expect(outMovement?.quantity).toBe(-5)
      expect(outMovement?.reason).toBe("TRANSFER_OUT")

      expect(inMovement).toBeDefined()
      expect(inMovement?.quantity).toBe(5)
      expect(inMovement?.reason).toBe("TRANSFER_IN")
    })
  })

  describe("Consolidation des Rapports et Scoping des Données", () => {
    it("doit isoler les données de rapports par magasin et les consolider correctement", async () => {
      const today = new Date()

      // 1. Créer des rapports consolidés fictifs pour Store A et Store B
      await prisma.consolidatedReport.create({
        data: {
          storeId: storeAId,
          date: today,
          ca: 100000,
          marge: 70000,
          nbOrders: 10,
          nbCouverts: 20,
        },
      })

      await prisma.consolidatedReport.create({
        data: {
          storeId: storeBId,
          date: today,
          ca: 150000,
          marge: 90000,
          nbOrders: 15,
          nbCouverts: 30,
        },
      })

      // 2. Interroger le dashboard consolidé pour Store A uniquement
      const reportA = await ConsolidatedService.getConsolidatedDashboard(today, today, storeAId)
      expect(reportA.kpis.totalCA).toBe(100000)
      expect(reportA.kpis.totalMarge).toBe(70000)
      expect(reportA.kpis.totalOrders).toBe(10)
      expect(reportA.kpis.margePercentage).toBe(70)

      // 3. Interroger le dashboard consolidé pour l'ensemble du réseau (all)
      const globalReport = await ConsolidatedService.getConsolidatedDashboard(today, today, "all")
      
      // Doit inclure Store A + Store B (100k + 150k = 250k)
      // (Nous devons filtrer pour exclure les autres magasins potentiels de la DB locale du dev pendant le test)
      const relevantComparison = globalReport.storeComparison.filter(
        sc => sc.storeId === storeAId || sc.storeId === storeBId
      )

      expect(relevantComparison).toHaveLength(2)
      
      const compA = relevantComparison.find(c => c.storeId === storeAId)
      const compB = relevantComparison.find(c => c.storeId === storeBId)

      expect(compA?.ca).toBe(100000)
      expect(compB?.ca).toBe(150000)
    })
  })
})
