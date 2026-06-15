import { useState } from 'react'
import { PermissionItem, PERMISSIONS_LIST } from '@/app/utils/permissions-config'

interface CustomPermission {
  permissionKey: string
  name: string
  desc: string
  module: string
}

export function useRightsSearch(
  customPermissions: CustomPermission[],
  rolePermissions: Record<string, boolean>,
  userPermissions: Record<string, { value: boolean; status: 'inherited' | 'authorized' | 'forbidden' }>,
  activeTab: string
) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeModule, setActiveModule] = useState('tableau_de_bord')

  // Get combined permissions list (system + custom)
  const getFullPermissionsList = (): PermissionItem[] => {
    const list = [...PERMISSIONS_LIST]
    for (const c of customPermissions) {
      if (!list.some((p) => p.key === c.permissionKey)) {
        list.push({
          key: c.permissionKey,
          name: c.name,
          desc: c.desc,
          module: c.module,
          category: 'Personnalisé'
        })
      }
    }
    return list
  }

  const fullList = getFullPermissionsList()

  // Filter permissions based on search query and active module
  const filteredPermissions = fullList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (activeTab !== 'lecture_metier' && !searchQuery) {
      return p.module === activeModule
    }

    return true
  })

  // Count active permissions per module
  const getActiveCountForModule = (moduleId: string): number => {
    const modulePerms = fullList.filter((p) => p.module === moduleId)
    let active = 0

    if (activeTab === 'permissions_role') {
      for (const p of modulePerms) {
        if (rolePermissions[p.key]) active++
      }
    } else if (activeTab === 'exceptions_user') {
      for (const p of modulePerms) {
        if (userPermissions[p.key]?.value) active++
      }
    }
    return active
  }

  return {
    searchQuery,
    setSearchQuery,
    activeModule,
    setActiveModule,
    filteredPermissions,
    fullList,
    getActiveCountForModule
  }
}
