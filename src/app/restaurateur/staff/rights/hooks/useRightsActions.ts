import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Role } from '@prisma/client'
import {
  getRolePermissions,
  updateRolePermission,
  resetRolePermissions,
  getUserPermissions,
  updateUserPermission,
  getCustomPermissions,
  addCustomPermission,
  deleteCustomPermission
} from '@/app/actions/auth/permissions'
import { getStoreStaff } from '@/app/actions/rh/staff'
import { StaffMember, CustomPermission } from '../types'

export function useRightsActions() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  // Tab & Theme states
  const [activeTab, setActiveTab] = useState<'permissions_role' | 'exceptions_user' | 'lecture_metier'>('permissions_role')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Data States
  const [selectedRole, setSelectedRole] = useState<Role>('CASHIER')
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [customPermissions, setCustomPermissions] = useState<CustomPermission[]>([])

  // Loading & Saving States
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  // Permissions Cache
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({})
  const [userPermissions, setUserPermissions] = useState<Record<string, { value: boolean; status: 'inherited' | 'authorized' | 'forbidden' }>>({})

  // Modal Custom Permission State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [customKey, setCustomKey] = useState('')
  const [customName, setCustomName] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customModule, setCustomModule] = useState('tableau_de_bord')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Theme Sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateTheme = () => {
        const savedTheme = localStorage.getItem('restaurateur_theme')
        setIsDarkMode(savedTheme === 'dark')
      }
      updateTheme()
      window.addEventListener('storage', updateTheme)
      return () => window.removeEventListener('storage', updateTheme)
    }
  }, [])

  const toggleTheme = () => {
    const nextVal = !isDarkMode
    setIsDarkMode(nextVal)
    localStorage.setItem('restaurateur_theme', nextVal ? 'dark' : 'light')
    window.dispatchEvent(new Event('storage'))
  }

  // Load initial data
  useEffect(() => {
    if (storeId) {
      void loadInitialData()
    }
  }, [storeId])

  // Load permissions per tab/selection
  useEffect(() => {
    if (storeId) {
      if (activeTab === 'permissions_role') {
        void loadRolePermissions()
      } else if (activeTab === 'exceptions_user' && selectedUser) {
        void loadUserPermissions()
      }
    }
  }, [storeId, activeTab, selectedRole, selectedUser])

  const loadInitialData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const staff = await getStoreStaff(storeId)
      const mappedStaff: StaffMember[] = (staff || []).map((s: any) => ({
        id: s.id,
        name: s.name || '',
        role: (s.role as Role) || 'CASHIER'
      }))

      setStaffList(mappedStaff)
      if (mappedStaff.length > 0) {
        setSelectedUser(mappedStaff[0].id)
      }

      const customRes = await getCustomPermissions(storeId)
      if (customRes.success && customRes.data) {
        setCustomPermissions(customRes.data as CustomPermission[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadRolePermissions = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const data = await getRolePermissions(storeId, selectedRole)
      setRolePermissions(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPermissions = async () => {
    if (!storeId || !selectedUser) return
    try {
      setLoading(true)
      const res = await getUserPermissions(storeId, selectedUser)
      if (res.success && res.permissions) {
        setUserPermissions(res.permissions)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const reloadCustomPermissions = async () => {
    if (!storeId) return
    const customRes = await getCustomPermissions(storeId)
    if (customRes.success && customRes.data) {
      setCustomPermissions(customRes.data as CustomPermission[])
    }
  }

  const handleToggleRolePermission = async (key: string, currentValue: boolean) => {
    if (!storeId) return
    try {
      setSavingKey(key)
      const res = await updateRolePermission(storeId, selectedRole, key, !currentValue)
      if (res.success) {
        setRolePermissions((prev) => ({
          ...prev,
          [key]: !currentValue
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingKey(null)
    }
  }

  const handleUpdateUserPermission = async (key: string, status: 'inherited' | 'authorized' | 'forbidden') => {
    if (!storeId || !selectedUser) return
    try {
      setSavingKey(key)
      const res = await updateUserPermission(storeId, selectedUser, key, status)
      if (res.success) {
        const userObj = staffList.find((u) => u.id === selectedUser)
        const role = userObj?.role || 'CASHIER'
        const basePermissions = await getRolePermissions(storeId, role)
        const baseValue = basePermissions[key] ?? false

        const newValue = status === 'authorized' ? true : status === 'forbidden' ? false : baseValue

        setUserPermissions((prev) => ({
          ...prev,
          [key]: {
            value: newValue,
            status
          }
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingKey(null)
    }
  }

  const handleResetToDefaults = async () => {
    if (!storeId) return
    try {
      setActionLoading(true)
      const res = await resetRolePermissions(storeId, selectedRole)
      if (res.success) {
        await loadRolePermissions()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const openCreateModal = (activeModule: string) => {
    setModalMode('create')
    setCustomKey('')
    setCustomName('')
    setCustomDesc('')
    setCustomModule(activeModule || 'tableau_de_bord')
    setEditingKey(null)
    setErrorMessage('')
    setIsModalOpen(true)
  }

  const openEditModal = (item: CustomPermission) => {
    setModalMode('edit')
    setCustomKey(item.permissionKey.replace('custom.', ''))
    setCustomName(item.name)
    setCustomDesc(item.desc)
    setCustomModule(item.module)
    setEditingKey(item.permissionKey)
    setErrorMessage('')
    setIsModalOpen(true)
  }

  const handleSaveCustomPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) return
    setErrorMessage('')

    if (!customKey.trim() || !customName.trim() || !customDesc.trim()) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.')
      return
    }

    try {
      setActionLoading(true)
      if (modalMode === 'create') {
        const res = await addCustomPermission(storeId, {
          key: customKey.trim(),
          name: customName.trim(),
          desc: customDesc.trim(),
          module: customModule
        })

        if (res.success) {
          setIsModalOpen(false)
          await reloadCustomPermissions()
          if (activeTab === 'permissions_role') {
            await loadRolePermissions()
          } else if (activeTab === 'exceptions_user') {
            await loadUserPermissions()
          }
        } else {
          setErrorMessage(res.error || 'Une erreur est survenue.')
        }
      } else {
        if (editingKey) {
          await deleteCustomPermission(storeId, editingKey)
          const res = await addCustomPermission(storeId, {
            key: customKey.trim(),
            name: customName.trim(),
            desc: customDesc.trim(),
            module: customModule
          })
          if (res.success) {
            setIsModalOpen(false)
            await reloadCustomPermissions()
            if (activeTab === 'permissions_role') {
              await loadRolePermissions()
            } else if (activeTab === 'exceptions_user') {
              await loadUserPermissions()
            }
          } else {
            setErrorMessage(res.error || 'Une erreur est survenue.')
          }
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('Une erreur réseau est survenue.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteCustomPermission = async (key: string) => {
    if (!storeId) return
    if (!confirm('Voulez-vous vraiment supprimer cette permission personnalisée ?')) return

    try {
      setActionLoading(true)
      const res = await deleteCustomPermission(storeId, key)
      if (res.success) {
        await reloadCustomPermissions()
        if (activeTab === 'permissions_role') {
          await loadRolePermissions()
        } else if (activeTab === 'exceptions_user') {
          await loadUserPermissions()
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  return {
    storeId,
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleTheme,
    selectedRole,
    setSelectedRole,
    staffList,
    selectedUser,
    setSelectedUser,
    customPermissions,
    loading,
    actionLoading,
    savingKey,
    rolePermissions,
    userPermissions,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    customKey,
    setCustomKey,
    customName,
    setCustomName,
    customDesc,
    setCustomDesc,
    customModule,
    setCustomModule,
    errorMessage,
    loadInitialData,
    handleToggleRolePermission,
    handleUpdateUserPermission,
    handleResetToDefaults,
    openCreateModal,
    openEditModal,
    handleSaveCustomPermission,
    handleDeleteCustomPermission
  }
}
