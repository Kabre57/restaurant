'use server'

import { requireAuth } from '@/lib/auth-guard'
import { StaffRepository } from '@/modules/staff/repositories/staff.repository'

export async function getHrDashboardMetrics() {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR"])

  try {
    // 1. Total employees
    const totalEmployees = await StaffRepository.countActiveEmployees(storeId)

    // 2. Active Contracts
    const activeContractsCount = await StaffRepository.countActiveContracts(storeId)

    // 3. Contracts ending soon (in the next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const expiringContracts = await StaffRepository.countExpiringContracts(storeId, thirtyDaysFromNow)

    // 4. Total Base Salary (Masse salariale théorique)
    const activeContracts = await StaffRepository.findActiveContractsBaseSalary(storeId)
    
    const totalBaseSalary = activeContracts.reduce((sum, c) => sum + c.baseSalary, 0)

    // 5. Recent Payrolls (Dernière paie générée)
    const now = new Date()
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const processedPayrolls = await StaffRepository.countProcessedPayrollsByPeriod(storeId, currentPeriod)

    return {
      success: true,
      metrics: {
        totalEmployees,
        activeContractsCount,
        expiringContracts,
        totalBaseSalary,
        processedPayrolls
      }
    }
  } catch (error) {
    console.error("Failed to fetch HR metrics:", error)
    return { success: false, error: 'Impossible de récupérer les statistiques.' }
  }
}
