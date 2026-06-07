'use server'

import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { DEFAULT_PERMISSIONS } from '../utils/permissions-config'

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
