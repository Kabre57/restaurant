'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { calculateIvoryCoastSalary } from '@/lib/rh/ivoryCoastTax'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

export async function getPayrolls(userId?: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const whereClause: Prisma.PayrollWhereInput = { user: { storeId } }
    if (userId) {
      whereClause.userId = userId
    }

    const payrolls = await prisma.payroll.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricule: true }
        }
      },
      orderBy: [
        { period: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    return { success: true, payrolls }
  } catch (error) {
    console.error("Failed to fetch payrolls:", error)
    return { success: false, error: 'Impossible de récupérer les bulletins de paie.' }
  }
}

export async function generatePayrollForPeriod(period: string) {
  const { storeId, userId: generatedBy } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // 1. Check HrConfiguration (if none, use default values)
    const hrConfig = await prisma.hrConfiguration.findFirst({
      where: { storeId }
    })
    
    const rates = {
      cnpsEmployeeRate: hrConfig?.cnpsEmployeeRate,
      cnpsEmployerRate: hrConfig?.cnpsEmployerRate,
      itsRate: hrConfig?.itsRate,
      baseImposableRate: hrConfig?.baseImposableRate,
      cnpsCeiling: hrConfig?.cnpsCeiling,
      igrBaseRate: hrConfig?.igrBaseRate,
      taxRates: hrConfig?.taxRates ? typeof hrConfig.taxRates === 'string' ? JSON.parse(hrConfig.taxRates) : hrConfig.taxRates : undefined,
    }

    // 2. Fetch all active users with a contract
    const activeEmployees = await prisma.user.findMany({
      where: { 
        storeId, 
        status: { not: 'INACTIVE' },
        contracts: { some: { status: 'ACTIVE' } }
      },
      include: {
        contracts: { where: { status: 'ACTIVE' }, take: 1 }
      }
    })

    const generated = []

    for (const emp of activeEmployees) {
      if (!emp.contracts.length) continue
      
      const contract = emp.contracts[0]
      const baseSalary = contract.baseSalary

      // Check if already generated
      const existing = await prisma.payroll.findFirst({
        where: { userId: emp.id, period }
      })

      if (existing) continue

      const taxResult = calculateIvoryCoastSalary(
        baseSalary, 
        emp.maritalStatus, 
        emp.numberOfChildren ?? 0, 
        rates
      )

      // Calculate simplistic net salary for MVP
      const netSalary = taxResult.netSalary
      const employerCost = taxResult.employerCost

      const payroll = await prisma.payroll.create({
        data: {
          userId: emp.id,
          period,
          baseSalary,
          socialSecurity: taxResult.cnpsSalarial, // CNPS Salariale
          taxAmount: taxResult.its + taxResult.contributionNationale + taxResult.igr, // IGR + ITS + CN
          netSalary,
          employerCost,
          paymentStatus: 'PENDING'
        }
      })
      
      generated.push(payroll)
    }

    // Log d'audit de la génération de paie
    console.info(`[AUDIT] Paie ${period} générée par ${generatedBy} pour le store ${storeId} — ${generated.length} bulletin(s)`)

    revalidatePath('/restaurateur/rh/paie')
    revalidatePath('/restaurateur/rh/dashboard')

    return { success: true, generatedCount: generated.length }
  } catch (error) {
    console.error("Failed to generate payrolls:", error)
    return { success: false, error: 'Erreur lors de la génération de la paie.' }
  }
}

export async function markPayrollAsPaid(id: string, reference?: string) {
  const { storeId, userId: markedBy } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // Vérifier que le bulletin appartient au store
    const existing = await prisma.payroll.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    })
    if (!existing) return { success: false, error: 'Bulletin introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Bulletin de paie")

    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        reference
      }
    })

    // Log d'audit du paiement
    console.info(`[AUDIT] Bulletin ${id} marqué comme payé par ${markedBy} — Ref: ${reference || 'N/A'}`)
    
    revalidatePath('/restaurateur/rh/paie')
    return { success: true, payroll }
  } catch (error) {
    console.error("Failed to mark payroll as paid:", error)
    return { success: false, error: 'Erreur lors de la mise à jour du statut.' }
  }
}
