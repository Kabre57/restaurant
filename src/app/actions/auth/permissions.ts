'use server'

import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { DEFAULT_PERMISSIONS } from '../../utils/permissions-config'
import { assertSameStore, requireAuth } from '@/lib/auth-guard'

export async function getRolePermissions(storeId: string, role: Role) {
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    const dbPermissions = await prisma.rolePermission.findMany({
      where: {
        storeId: authStoreId,
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
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    const upserted = await prisma.rolePermission.upsert({
      where: {
        storeId_role_permissionKey: {
          storeId: authStoreId,
          role,
          permissionKey
        }
      },
      update: {
        enabled
      },
      create: {
        storeId: authStoreId,
        role,
        permissionKey,
        enabled
      }
    })

    revalidatePath('/restaurateur/staff/rights')
    return { success: true, data: upserted }
  } catch (error) {
    console.error('[updateRolePermission]', error)
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la permission.'
    return { success: false, error: message }
  }
}

export async function resetRolePermissions(storeId: string, role: Role) {
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    await prisma.rolePermission.deleteMany({
      where: {
        storeId: authStoreId,
        role
      }
    })

    revalidatePath('/restaurateur/staff/rights')
    return { success: true }
  } catch (error) {
    console.error('[resetRolePermissions]', error)
    const message = error instanceof Error ? error.message : 'Erreur lors de la réinitialisation.'
    return { success: false, error: message }
  }
}
