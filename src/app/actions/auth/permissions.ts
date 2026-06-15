'use server'

import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { DEFAULT_PERMISSIONS, PERMISSIONS_LIST } from '../../utils/permissions-config'
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

// --- USER EXCEPTIONS ACTIONS ---

export async function getUserPermissions(storeId: string, userId: string) {
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, storeId: true }
    })

    if (!user || user.storeId !== authStoreId) {
      throw new Error("Utilisateur non trouvé ou n'appartient pas à cet établissement.")
    }

    const role = user.role
    // Load database role permissions
    const dbRolePermissions = await prisma.rolePermission.findMany({
      where: { storeId: authStoreId, role }
    })

    const roleBase = { ...DEFAULT_PERMISSIONS[role] }
    for (const p of dbRolePermissions) {
      roleBase[p.permissionKey] = p.enabled
    }

    // Load custom permissions for store
    const dbCustom = await prisma.customPermission.findMany({
      where: { storeId: authStoreId }
    })

    // Add custom permission keys to roleBase (default to false if not configured for role)
    for (const c of dbCustom) {
      if (!(c.permissionKey in roleBase)) {
        roleBase[c.permissionKey] = false
      }
    }

    // Load user exceptions
    const userExceptions = await prisma.userPermission.findMany({
      where: { userId }
    })

    const permissions: Record<string, { value: boolean; status: 'inherited' | 'authorized' | 'forbidden' }> = {}
    
    // Process all known permission keys
    const allKeys = new Set([
      ...PERMISSIONS_LIST.map(p => p.key),
      ...dbCustom.map(c => c.permissionKey),
      ...Object.keys(roleBase)
    ])

    for (const key of allKeys) {
      const exception = userExceptions.find(e => e.permissionKey === key)
      const baseValue = roleBase[key] ?? false

      if (exception) {
        permissions[key] = {
          value: exception.enabled,
          status: exception.enabled ? 'authorized' : 'forbidden'
        }
      } else {
        permissions[key] = {
          value: baseValue,
          status: 'inherited'
        }
      }
    }

    return { success: true, role, permissions }
  } catch (error) {
    console.error('[getUserPermissions]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

export async function updateUserPermission(
  storeId: string, 
  userId: string, 
  permissionKey: string, 
  status: 'inherited' | 'authorized' | 'forbidden'
) {
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storeId: true }
    })

    if (!user || user.storeId !== authStoreId) {
      throw new Error("Utilisateur non trouvé ou n'appartient pas à cet établissement.")
    }

    if (status === 'inherited') {
      await prisma.userPermission.deleteMany({
        where: { userId, permissionKey }
      })
    } else {
      const enabled = status === 'authorized'
      await prisma.userPermission.upsert({
        where: {
          userId_permissionKey: {
            userId,
            permissionKey
          }
        },
        update: {
          enabled
        },
        create: {
          userId,
          permissionKey,
          enabled
        }
      })
    }

    revalidatePath('/restaurateur/staff/rights')
    return { success: true }
  } catch (error) {
    console.error('[updateUserPermission]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour.' }
  }
}

// --- CUSTOM PERMISSIONS ACTIONS ---

export async function getCustomPermissions(storeId: string) {
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    const custom = await prisma.customPermission.findMany({
      where: { storeId: authStoreId },
      orderBy: { createdAt: 'asc' }
    })
    return { success: true, data: custom }
  } catch (error) {
    console.error('[getCustomPermissions]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

export async function addCustomPermission(
  storeId: string,
  data: { key: string; name: string; desc: string; module: string }
) {
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    let key = data.key.trim()
    if (!key.startsWith('custom.')) {
      key = `custom.${key}`
    }

    // Check if key already exists globally
    const isGlobal = PERMISSIONS_LIST.some(p => p.key === key)
    if (isGlobal) {
      throw new Error("Cette clé de permission est déjà définie au niveau système.")
    }

    const existing = await prisma.customPermission.findUnique({
      where: {
        storeId_permissionKey: {
          storeId: authStoreId,
          permissionKey: key
        }
      }
    })

    if (existing) {
      throw new Error("Cette clé de permission existe déjà pour cet établissement.")
    }

    const created = await prisma.customPermission.create({
      data: {
        storeId: authStoreId,
        permissionKey: key,
        name: data.name,
        desc: data.desc,
        module: data.module
      }
    })

    revalidatePath('/restaurateur/staff/rights')
    return { success: true, data: created }
  } catch (error) {
    console.error('[addCustomPermission]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la création.' }
  }
}

export async function deleteCustomPermission(storeId: string, permissionKey: string) {
  const { storeId: authStoreId } = await requireAuth(["ADMIN", "RESTAURATEUR"])
  assertSameStore(storeId, authStoreId, "Permissions")

  try {
    // Delete custom permission definition
    await prisma.customPermission.delete({
      where: {
        storeId_permissionKey: {
          storeId: authStoreId,
          permissionKey
        }
      }
    })

    // Clean up role permissions
    await prisma.rolePermission.deleteMany({
      where: {
        storeId: authStoreId,
        permissionKey
      }
    })

    // Clean up user permission exceptions for users in this store
    const storeUsers = await prisma.user.findMany({
      where: { storeId: authStoreId },
      select: { id: true }
    })
    const userIds = storeUsers.map(u => u.id)

    await prisma.userPermission.deleteMany({
      where: {
        userId: { in: userIds },
        permissionKey
      }
    })

    revalidatePath('/restaurateur/staff/rights')
    return { success: true }
  } catch (error) {
    console.error('[deleteCustomPermission]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la suppression.' }
  }
}
