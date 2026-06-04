'use server'

import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// Predefined default permissions for roles
export const DEFAULT_PERMISSIONS: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    POS_ACCESS: true,
    CASH_DRAWER_ACCESS: true,
    KDS_ACCESS: true,
    STOCK_ACCESS: true,
    STOCK_ADJUSTMENT: true,
    HR_ACCESS: true,
    ANALYTICS_ACCESS: true,
    CONFIG_ACCESS: true,
  },
  MANAGER: {
    POS_ACCESS: true,
    CASH_DRAWER_ACCESS: true,
    KDS_ACCESS: true,
    STOCK_ACCESS: true,
    STOCK_ADJUSTMENT: true,
    HR_ACCESS: true,
    ANALYTICS_ACCESS: true,
    CONFIG_ACCESS: false,
  },
  CASHIER: {
    POS_ACCESS: true,
    CASH_DRAWER_ACCESS: true,
    KDS_ACCESS: false,
    STOCK_ACCESS: false,
    STOCK_ADJUSTMENT: false,
    HR_ACCESS: false,
    ANALYTICS_ACCESS: false,
    CONFIG_ACCESS: false,
  },
  SERVER: {
    POS_ACCESS: true,
    CASH_DRAWER_ACCESS: false,
    KDS_ACCESS: false,
    STOCK_ACCESS: false,
    STOCK_ADJUSTMENT: false,
    HR_ACCESS: false,
    ANALYTICS_ACCESS: false,
    CONFIG_ACCESS: false,
  },
  KITCHEN: {
    POS_ACCESS: false,
    CASH_DRAWER_ACCESS: false,
    KDS_ACCESS: true,
    STOCK_ACCESS: false,
    STOCK_ADJUSTMENT: false,
    HR_ACCESS: false,
    ANALYTICS_ACCESS: false,
    CONFIG_ACCESS: false,
  },
  DELIVERY: {
    POS_ACCESS: true,
    CASH_DRAWER_ACCESS: false,
    KDS_ACCESS: false,
    STOCK_ACCESS: false,
    STOCK_ADJUSTMENT: false,
    HR_ACCESS: false,
    ANALYTICS_ACCESS: false,
    CONFIG_ACCESS: false,
  },
  ADMIN: {
    POS_ACCESS: true,
    CASH_DRAWER_ACCESS: true,
    KDS_ACCESS: true,
    STOCK_ACCESS: true,
    STOCK_ADJUSTMENT: true,
    HR_ACCESS: true,
    ANALYTICS_ACCESS: true,
    CONFIG_ACCESS: true,
  }
}

export const PERMISSIONS_LIST = [
  { key: 'POS_ACCESS', name: 'Point de Vente (POS)', desc: 'Prendre des commandes, encaisser les paiements, gérer le panier local' },
  { key: 'CASH_DRAWER_ACCESS', name: 'Tiroir-caisse physique', desc: 'Ouvrir le tiroir-caisse manuellement et voir le montant attendu en caisse' },
  { key: 'KDS_ACCESS', name: 'Kitchen Display System (KDS)', desc: 'Consulter et valider les commandes en préparation en cuisine' },
  { key: 'STOCK_ACCESS', name: 'Suivi des Stocks Avancés', desc: 'Enregistrer les livraisons fournisseurs, transferts d\'articles, fiches de production' },
  { key: 'STOCK_ADJUSTMENT', name: 'Ajustement de stock manuel', desc: 'Ajuster manuellement les quantités (perte, vol, casse, inventaire)' },
  { key: 'HR_ACCESS', name: 'Ressources Humaines (Paie)', desc: 'Consulter les salaires, éditer les fiches de paie et les contrats' },
  { key: 'ANALYTICS_ACCESS', name: 'Rapports & Stats de performance', desc: 'Accéder aux graphiques de ventes journalières, évaluations de marge' },
  { key: 'CONFIG_ACCESS', name: 'Configuration Système & Imprimantes', desc: 'Modifier les adresses IP des imprimantes locales, jetons d\'API et webhook' },
]

export async function getRolePermissions(storeId: string, role: Role) {
  try {
    const dbPermissions = await prisma.rolePermission.findMany({
      where: {
        storeId,
        role
      }
    })

    // Merge defaults with database configuration
    const merged = { ...DEFAULT_PERMISSIONS[role] }
    for (const dbPerm of dbPermissions) {
      merged[dbPerm.permissionKey] = dbPerm.enabled
    }

    return merged
  } catch (error) {
    console.error('[getRolePermissions]', error)
    return DEFAULT_PERMISSIONS[role]
  }
}

export async function updateRolePermission(storeId: string, role: Role, permissionKey: string, enabled: boolean) {
  try {
    const upserted = await prisma.rolePermission.upsert({
      where: {
        storeId_role_permissionKey: {
          storeId,
          role,
          permissionKey
        }
      },
      update: {
        enabled
      },
      create: {
        storeId,
        role,
        permissionKey,
        enabled
      }
    })

    revalidatePath('/restaurateur/staff/rights')
    return { success: true, data: upserted }
  } catch (error: any) {
    console.error('[updateRolePermission]', error)
    return { success: false, error: error.message || 'Erreur lors de la mise à jour de la permission.' }
  }
}

export async function resetRolePermissions(storeId: string, role: Role) {
  try {
    await prisma.rolePermission.deleteMany({
      where: {
        storeId,
        role
      }
    })

    revalidatePath('/restaurateur/staff/rights')
    return { success: true }
  } catch (error: any) {
    console.error('[resetRolePermissions]', error)
    return { success: false, error: error.message || 'Erreur lors de la réinitialisation.' }
  }
}
