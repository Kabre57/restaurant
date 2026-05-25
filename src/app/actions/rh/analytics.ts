'use server'

import prisma from '@/lib/prisma'

export async function getHrDashboardMetrics(storeId: string) {
  try {
    // 1. Total employees
    const totalEmployees = await prisma.user.count({
      where: { storeId, status: { not: 'INACTIVE' } }
    })

    // 2. Active Contracts
    const activeContractsCount = await prisma.contract.count({
      where: { 
        user: { storeId },
        status: 'ACTIVE'
      }
    })

    // 3. Contracts ending soon (in the next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const expiringContracts = await prisma.contract.count({
      where: {
        user: { storeId },
        status: 'ACTIVE',
        endDate: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      }
    })

    // 4. Total Base Salary (Masse salariale théorique)
    const activeContracts = await prisma.contract.findMany({
      where: {
        user: { storeId },
        status: 'ACTIVE'
      },
      select: { baseSalary: true }
    })
    
    const totalBaseSalary = activeContracts.reduce((sum, c) => sum + c.baseSalary, 0)

    // 5. Recent Payrolls (Dernière paie générée)
    const now = new Date()
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const processedPayrolls = await prisma.payroll.count({
      where: {
        user: { storeId },
        period: currentPeriod
      }
    })

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
