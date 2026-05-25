'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type HrConfigurationData = {
  cnpsEmployeeRate: number
  cnpsEmployerRate: number
  itsRate: number
  baseImposableRate: number
  cnpsCeiling: number
  igrBaseRate: number
  taxRates: string
}

export async function getHrConfiguration(storeId: string) {
  try {
    const config = await prisma.hrConfiguration.findUnique({
      where: { storeId }
    })
    
    // Si la configuration n'existe pas, on retourne les valeurs par défaut
    if (!config) {
      return { 
        success: true, 
        config: {
          storeId,
          cnpsEmployeeRate: 6.3,
          cnpsEmployerRate: 16.45,
          itsRate: 1.2,
          baseImposableRate: 80.0,
          cnpsCeiling: 1647315,
          igrBaseRate: 85.0,
          taxRates: JSON.stringify({
            cnBrackets: [
              { min: 0, max: 50000, rate: 0 },
              { min: 50000, max: 130000, rate: 0.015 },
              { min: 130000, max: 200000, rate: 0.05 },
              { min: 200000, max: null, rate: 0.10 }
            ],
            igrBrackets: [
              { min: 833333, rate: 0.36, deduction: 80533 },
              { min: 416666, rate: 0.32, deduction: 47200 },
              { min: 275000, rate: 0.28, deduction: 30533 },
              { min: 195833, rate: 0.24, deduction: 19533 },
              { min: 112500, rate: 0.20, deduction: 11700 },
              { min: 71500, rate: 0.15, deduction: 6075 },
              { min: 25000, rate: 0.10, deduction: 2500 },
              { min: 0, rate: 0, deduction: 0 }
            ],
            partsConfig: {
              SINGLE: { base: 1, withChildrenBase: 1.5, perChild: 0.5 },
              DIVORCED: { base: 1, withChildrenBase: 1.5, perChild: 0.5 },
              MARRIED: { base: 2, withChildrenBase: 2, perChild: 0.5 },
              WIDOWED: { base: 2, withChildrenBase: 2, perChild: 0.5 },
              maxParts: 5
            }
          })
        }  
      }
    }
    
    return { success: true, config }
  } catch (error) {
    console.error("Failed to fetch HR configuration:", error)
    return { success: false, error: 'Impossible de récupérer la configuration.' }
  }
}

export async function updateHrConfiguration(storeId: string, data: HrConfigurationData) {
  try {
    const config = await prisma.hrConfiguration.upsert({
      where: { storeId },
      update: {
        cnpsEmployeeRate: data.cnpsEmployeeRate,
        cnpsEmployerRate: data.cnpsEmployerRate,
        itsRate: data.itsRate,
        baseImposableRate: data.baseImposableRate,
        cnpsCeiling: data.cnpsCeiling,
        igrBaseRate: data.igrBaseRate,
        taxRates: JSON.parse(data.taxRates)
      },
      create: {
        storeId,
        cnpsEmployeeRate: data.cnpsEmployeeRate,
        cnpsEmployerRate: data.cnpsEmployerRate,
        itsRate: data.itsRate,
        baseImposableRate: data.baseImposableRate,
        cnpsCeiling: data.cnpsCeiling,
        igrBaseRate: data.igrBaseRate,
        taxRates: JSON.parse(data.taxRates)
      }
    })

    revalidatePath('/restaurateur/rh/configuration')
    revalidatePath('/restaurateur/rh')
    
    return { success: true, config }
  } catch (error) {
    console.error("Failed to update HR configuration:", error)
    return { success: false, error: 'Erreur lors de la mise à jour de la configuration.' }
  }
}
