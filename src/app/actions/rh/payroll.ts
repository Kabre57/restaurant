'use server'

import { revalidatePath } from 'next/cache'
import { calculateIvoryCoastSalary } from '@/lib/rh/ivoryCoastTax'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'
import { PayrollRepository } from '@/modules/staff/repositories/payroll.repository'
import { runInTransaction } from '@/infrastructure/prisma/transaction'

export async function getPayrolls(userId?: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const payrolls = await PayrollRepository.findPayrollsByStore(storeId, userId)
    return { success: true, payrolls }
  } catch (error) {
    console.error("Failed to fetch payrolls:", error)
    return { success: false, error: 'Impossible de récupérer les bulletins de paie.' }
  }
}

export async function generatePayrollForPeriod(period: string) {
  const { storeId, userId: generatedBy } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // 0. Vérifier si la période est clôturée
    const isClosed = await PayrollRepository.findClotureMois(storeId, period)
    if (isClosed) {
      return { success: false, error: 'Cette période de paie est clôturée.' }
    }

    // 1. Check HrConfiguration (if none, use default values)
    const hrConfig = await PayrollRepository.findHrConfiguration(storeId)
    
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
    const activeEmployees = await PayrollRepository.findActiveEmployeesWithContracts(storeId)

    const generated = []

    for (const emp of activeEmployees) {
      if (!emp.contracts.length) continue
      
      const contract = emp.contracts[0]
      const baseSalary = contract.baseSalary

      // Check if already generated
      const existing = await PayrollRepository.findPayrollByEmployeeAndPeriod(emp.id, period)

      if (existing) continue

      // Gratification / 13ème Mois (en Décembre)
      const isDecember = period.endsWith('-12')
      let bonus13th = 0
      if (isDecember) {
        const startYear = new Date(contract.startDate).getFullYear()
        const year = parseInt(period.split('-')[0])
        if (startYear < year) {
          bonus13th = baseSalary
        } else if (startYear === year) {
          const startMonth = new Date(contract.startDate).getMonth() // 0-11
          const monthsWorked = 12 - startMonth
          bonus13th = Math.round(baseSalary * (monthsWorked / 12))
        }
      }

      // Calcul standard pour le mois en cours
      const taxResult = calculateIvoryCoastSalary(
        baseSalary, 
        emp.maritalStatus, 
        emp.numberOfChildren ?? 0, 
        rates,
        bonus13th
      )

      let taxAmount = taxResult.its + taxResult.contributionNationale + taxResult.igr

      // Liquidation Annuelle IGR en Décembre
      if (isDecember) {
        const year = period.split('-')[0]
        const previousPayrolls = await PayrollRepository.findPreviousPayrollsInYear(emp.id, `${year}-`, period)

        const sumPrevBrut = previousPayrolls.reduce((sum, p) => sum + p.baseSalary, 0)
        const sumPrevTax = previousPayrolls.reduce((sum, p) => sum + p.taxAmount, 0)
        const totalBrutYear = sumPrevBrut + baseSalary + bonus13th
        const avgMonthlyBrut = totalBrutYear / 12

        const avgMonthlyResult = calculateIvoryCoastSalary(
          avgMonthlyBrut,
          emp.maritalStatus,
          emp.numberOfChildren ?? 0,
          rates
        )

        const targetAnnualTax = (avgMonthlyResult.its + avgMonthlyResult.contributionNationale + avgMonthlyResult.igr) * 12
        taxAmount = Math.max(0, targetAnnualTax - sumPrevTax)
      }

      // Net salary et coût employeur ajustés
      const netSalary = (baseSalary + bonus13th) - taxResult.cnpsSalarial - taxAmount
      const employerCost = (baseSalary + bonus13th) + taxResult.cnpsPatronal

      const payroll = await PayrollRepository.createPayroll({
        userId: emp.id,
        period,
        baseSalary,
        socialSecurity: taxResult.cnpsSalarial, // CNPS Salariale
        taxAmount, // IGR + ITS + CN (Éventuellement liquidé en Décembre)
        netSalary,
        employerCost,
        paymentStatus: 'PENDING'
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
    const existing = await PayrollRepository.findPayrollById(id)
    if (!existing) return { success: false, error: 'Bulletin introuvable.' }
    assertSameStore(existing.user.storeId, storeId, "Bulletin de paie")

    // Vérifier si la période est clôturée
    const isClosed = await PayrollRepository.findClotureMois(storeId, existing.period)
    if (isClosed) {
      return { success: false, error: 'La période de ce bulletin est clôturée.' }
    }

    const payroll = await PayrollRepository.updatePayroll(id, {
      paymentStatus: 'PAID',
      paymentDate: new Date(),
      reference
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

export async function cloturerPeriode(period: string) {
  const { storeId, userId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const cloture = await PayrollRepository.upsertClotureMois(storeId, period, true, userId)

    console.info(`[AUDIT] Période ${period} clôturée par ${userId} pour le store ${storeId}`)
    revalidatePath('/restaurateur/rh/paie')
    return { success: true, cloture }
  } catch (error) {
    console.error("Failed to close period:", error)
    return { success: false, error: 'Erreur lors de la clôture de la période.' }
  }
}

export async function reouvrirPeriode(period: string) {
  const { storeId, userId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    const cloture = await PayrollRepository.updateClotureMois(storeId, period, false, userId)

    console.info(`[AUDIT] Période ${period} réouverte par ${userId} pour le store ${storeId}`)
    revalidatePath('/restaurateur/rh/paie')
    return { success: true, cloture }
  } catch (error) {
    console.error("Failed to reopen period:", error)
    return { success: false, error: 'Erreur lors de la réouverture de la période.' }
  }
}
