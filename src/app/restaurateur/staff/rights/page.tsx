'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  ShieldAlert,
  RefreshCw,
  Loader2,
  Sun,
  Moon,
  Search,
  Plus,
  Trash2,
  Edit,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Info,
  Lock,
  Settings,
  Key,
  Check,
  X
} from 'lucide-react'
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
import { PERMISSIONS_LIST, MODULES_LIST, PermissionItem, DEFAULT_PERMISSIONS } from '@/app/utils/permissions-config'

type TabType = 'permissions_role' | 'exceptions_user' | 'lecture_metier'

const SYSTEM_ROLES: Role[] = [
  'RESTAURATEUR',
  'MANAGER',
  'CASHIER',
  'SERVER',
  'KITCHEN',
  'DELIVERY',
  'LIVREUR',
  'ADMIN',
  'SUPER_ADMIN',
  'STORE_MANAGER',
  'STORE_EMPLOYEE'
]

const ROLE_LABELS: Record<Role, string> = {
  RESTAURATEUR: 'Propriétaire',
  MANAGER: 'Gérant',
  CASHIER: 'Caissier(ère)',
  SERVER: 'Serveur(se)',
  KITCHEN: 'Cuisinier(ère)',
  DELIVERY: 'Gest. Livraison',
  LIVREUR: 'Livreur (PWA)',
  ADMIN: 'Admin Plateforme',
  SUPER_ADMIN: 'Super Admin',
  STORE_MANAGER: 'Dir. Établissement',
  STORE_EMPLOYEE: 'Employé Établissement'
}

export default function AccessRightsDashboard() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('permissions_role')

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Data State
  const [selectedRole, setSelectedRole] = useState<Role>('CASHIER')
  const [staffList, setStaffList] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [customPermissions, setCustomPermissions] = useState<any[]>([])

  // Loading & Action states
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  // Permissions Cache
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({})
  const [userPermissions, setUserPermissions] = useState<Record<string, { value: boolean; status: 'inherited' | 'authorized' | 'forbidden' }>>({})

  // Sidebar Module filter
  const [activeModule, setActiveModule] = useState<string>('tableau_de_bord')

  // Global search query
  const [searchQuery, setSearchQuery] = useState('')

  // Modal custom permission State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [customKey, setCustomKey] = useState('')
  const [customName, setCustomName] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customModule, setCustomModule] = useState('tableau_de_bord')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Load theme preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateTheme = () => {
        const savedTheme = localStorage.getItem('restaurateur_theme')
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark')
        } else {
          setIsDarkMode(false)
        }
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

  // Load staff list & custom permissions on mount/storeId change
  useEffect(() => {
    if (storeId) {
      void loadInitialData()
    }
  }, [storeId])

  // Load specific permissions when dependencies change
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
      setStaffList(staff)
      if (staff.length > 0) {
        setSelectedUser(staff[0].id)
      }

      const customRes = await getCustomPermissions(storeId)
      if (customRes.success && customRes.data) {
        setCustomPermissions(customRes.data)
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

  // Reload custom permissions only
  const reloadCustomPermissions = async () => {
    if (!storeId) return
    const customRes = await getCustomPermissions(storeId)
    if (customRes.success && customRes.data) {
      setCustomPermissions(customRes.data)
    }
  }

  // Actions
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
        // Find base role value to calculate new value
        const userObj = staffList.find(u => u.id === selectedUser)
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

  // Custom Permissions Modal Handling
  const openCreateModal = () => {
    setModalMode('create')
    setCustomKey('')
    setCustomName('')
    setCustomDesc('')
    setCustomModule(activeModule || 'tableau_de_bord')
    setEditingKey(null)
    setErrorMessage('')
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
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
      setErrorMessage("Veuillez remplir tous les champs obligatoires.")
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
          setErrorMessage(res.error || "Une erreur est survenue.")
        }
      } else {
        // Modify operation (Since it's custom, we delete the old one and create the new one to simulate editing in simple DB)
        // Check if key changed, or just update metadata
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
            setErrorMessage(res.error || "Une erreur est survenue.")
          }
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMessage("Une erreur réseau est survenue.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteCustomPermission = async (key: string) => {
    if (!storeId) return
    if (!confirm("Voulez-vous vraiment supprimer cette permission personnalisée ?")) return

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

  // Aggregate Permissions (System + Custom)
  const getFullPermissionsList = (): PermissionItem[] => {
    const list = [...PERMISSIONS_LIST]

    // Merge custom permissions
    for (const c of customPermissions) {
      // Avoid duplication
      if (!list.some(p => p.key === c.permissionKey)) {
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

  // Filter logic
  const filteredPermissions = fullList.filter(p => {
    // 1. Search Query
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    // 2. Module active selection (only if not searching globally or when tab demands sidebar filtering)
    if (activeTab !== 'lecture_metier' && !searchQuery) {
      return p.module === activeModule
    }

    return true
  })

  // Count active permissions per module for the badges
  const getActiveCountForModule = (moduleId: string): number => {
    const modulePerms = fullList.filter(p => p.module === moduleId)
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

  // Statistics calculation
  const totalCount = fullList.length
  const activeCount = Object.values(rolePermissions).filter(Boolean).length

  // Styles dynamically based on theme
  const bgTheme = isDarkMode ? 'bg-[#0b0c10] text-[#eceff4]' : 'bg-[#f4f6f9] text-[#212529]'
  const cardTheme = isDarkMode ? 'bg-[#151821] border-[#252a37] shadow-xl' : 'bg-white border-[#e3e8f0] shadow-sm'
  const titleTheme = isDarkMode ? 'text-white' : 'text-[#1a202c]'
  const descTheme = isDarkMode ? 'text-[#9faab7]' : 'text-[#64748b]'
  const borderTheme = isDarkMode ? 'border-[#252a37]' : 'border-[#e2e8f0]'
  const hoverRowTheme = isDarkMode ? 'hover:bg-[#1a1e2a]' : 'hover:bg-[#f8fafc]'
  const badgeTheme = (cat: string) => {
    if (cat === 'Personnalisé') return 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
    if (cat === 'Lecture') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
    if (cat === 'Actions') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
    return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
  }

  return (
    <div className={`min-h-screen transition-all duration-300 p-4 sm:p-6 lg:p-8 ${bgTheme}`}>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* TOP HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight uppercase ${titleTheme}`}>
              Droits & Permissions
            </h1>
            <p className={`${descTheme} text-xs font-semibold uppercase tracking-wider mt-1`}>
              Configuration modulaire et gestion granulaire de la sécurité de votre établissement
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-2xl transition-all border shadow-sm ${isDarkMode
                  ? 'bg-[#1e2230] border-[#2d334a] text-amber-400 hover:bg-[#282e42]'
                  : 'bg-white border-[#cbd5e1] text-slate-700 hover:bg-slate-50'
                }`}
              title={isDarkMode ? 'Passer au Mode Clair' : 'Passer au Mode Sombre'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Reload button */}
            <button
              onClick={loadInitialData}
              className={`p-3 rounded-2xl transition-all border shadow-sm ${isDarkMode
                  ? 'bg-[#1e2230] border-[#2d334a] text-slate-200 hover:bg-[#282e42]'
                  : 'bg-white border-[#cbd5e1] text-slate-700 hover:bg-slate-50'
                }`}
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* New Permission button */}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold uppercase tracking-wider text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 hover:from-amber-600 hover:to-orange-700 transition"
            >
              <Plus className="w-4 h-4" />
              Nouvelle permission
            </button>
          </div>
        </div>

        {/* STATISTICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Permissions Card */}
          <div className={`p-6 rounded-3xl border flex items-center justify-between ${cardTheme}`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${descTheme}`}>Permissions système</span>
              <h3 className={`text-2xl font-black ${titleTheme}`}>
                {activeTab === 'permissions_role' ? `${activeCount} / ${totalCount}` : `${totalCount} Actives`}
              </h3>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          {/* Modules Card */}
          <div className={`p-6 rounded-3xl border flex items-center justify-between ${cardTheme}`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${descTheme}`}>Modules Opérationnels</span>
              <h3 className={`text-2xl font-black ${titleTheme}`}>{MODULES_LIST.length} Domaines</h3>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <Settings className="w-6 h-6" />
            </div>
          </div>

          {/* System Roles Card */}
          <div className={`p-6 rounded-3xl border flex items-center justify-between ${cardTheme}`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${descTheme}`}>Rôles Système</span>
              <h3 className={`text-2xl font-black ${titleTheme}`}>{SYSTEM_ROLES.length} Rôles</h3>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* TABS & SEARCH CONTAINER */}
        <div className={`p-4 rounded-3xl border ${cardTheme}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* View selectors */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setActiveTab('permissions_role')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'permissions_role'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                Permissions par rôle
              </button>
              <button
                onClick={() => setActiveTab('exceptions_user')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'exceptions_user'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                Exceptions utilisateur
              </button>
              <button
                onClick={() => setActiveTab('lecture_metier')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'lecture_metier'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                Lecture métier
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une permission, description ou sous-module..."
                className={`w-full pl-10 pr-4 py-3 text-xs rounded-2xl border outline-none font-medium transition ${isDarkMode
                    ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                    : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
                  }`}
              />
            </div>
          </div>

          {/* DYNAMIC CONTEXTUAL HEADER CARD */}
          {activeTab === 'permissions_role' && (
            <div className={`mt-4 p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'bg-[#1c1f2a] border-[#2b3145]' : 'bg-slate-50 border-[#cbd5e1]'
              }`}>
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Configurer le rôle :</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${isDarkMode ? 'bg-[#151821] border-[#2d334a] text-white' : 'bg-white border-[#cbd5e1] text-slate-800'
                    }`}
                >
                  {SYSTEM_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleResetToDefaults}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151821] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-[#1f2330] transition text-slate-700 dark:text-slate-200"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Rétablir défauts
              </button>
            </div>
          )}

          {activeTab === 'exceptions_user' && (
            <div className={`mt-4 p-5 rounded-2xl border flex flex-col md:flex-row md:items-center gap-4 ${isDarkMode ? 'bg-[#1c1f2a] border-[#2b3145]' : 'bg-slate-50 border-[#cbd5e1]'
              }`}>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500 shrink-0">Sélectionner un collaborateur :</span>
              {staffList.length === 0 ? (
                <span className="text-xs font-semibold text-slate-500">Aucun employé enregistré</span>
              ) : (
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${isDarkMode ? 'bg-[#151821] border-[#2d334a] text-white' : 'bg-white border-[#cbd5e1] text-slate-800'
                    }`}
                >
                  {staffList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({ROLE_LABELS[u.role as Role] || u.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* MAIN LAYOUT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Chargement des autorisations...</span>
          </div>
        ) : (
          <>
            {activeTab !== 'lecture_metier' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* SIDEBAR: MODULES LIST */}
                <div className="lg:col-span-3 space-y-3">
                  <div className={`p-4 rounded-3xl border ${cardTheme}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${descTheme} mb-3 px-1`}>
                      Modules & Domaines
                    </h3>
                    <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-2 lg:pb-0">
                      {MODULES_LIST.map((mod) => {
                        const count = getActiveCountForModule(mod.id)
                        const total = fullList.filter(p => p.module === mod.id).length
                        const isSelected = activeModule === mod.id && !searchQuery

                        return (
                          <button
                            key={mod.id}
                            onClick={() => {
                              setActiveModule(mod.id)
                              setSearchQuery('')
                            }}
                            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 shrink-0 lg:shrink ${isSelected
                                ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                : isDarkMode
                                  ? 'bg-[#151821] border-[#252a37] text-slate-300 hover:bg-[#1a1e2a]'
                                  : 'bg-white border-[#cbd5e1] text-slate-700 hover:bg-slate-50'
                              }`}
                          >
                            <div className="text-left">
                              <p className="text-xs font-black uppercase tracking-wider truncate max-w-[150px] lg:max-w-none">
                                {mod.name}
                              </p>
                              <p className={`text-[9px] font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'} mt-0.5`}>
                                {mod.pages.length} pages
                              </p>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                              {count}/{total}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* CONTENT AREA: DETAILED PERMISSIONS */}
                <div className="lg:col-span-9 space-y-4">
                  {filteredPermissions.length === 0 ? (
                    <div className={`p-12 text-center rounded-3xl border flex flex-col items-center justify-center gap-3 ${cardTheme}`}>
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aucune permission ne correspond à votre recherche.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredPermissions.map((perm) => {
                        const isSaving = savingKey === perm.key
                        const isCustom = perm.key.startsWith('custom.')

                        return (
                          <div
                            key={perm.key}
                            className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardTheme} ${hoverRowTheme}`}
                          >
                            <div className="space-y-1.5 max-w-xl">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-black uppercase tracking-wider ${titleTheme}`}>
                                  {perm.name}
                                </span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badgeTheme(perm.category)}`}>
                                  {perm.category}
                                </span>
                                {isCustom && (
                                  <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs font-medium leading-relaxed ${descTheme}`}>
                                {perm.desc}
                              </p>
                              <code className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">
                                Clé: {perm.key}
                              </code>
                            </div>

                            {/* Actions Control */}
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Edit/Delete custom permission if creator */}
                              {isCustom && (
                                <div className="flex items-center gap-1.5 mr-2">
                                  <button
                                    onClick={() => {
                                      const c = customPermissions.find(cp => cp.permissionKey === perm.key)
                                      if (c) openEditModal(c)
                                    }}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
                                    title="Modifier la permission"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomPermission(perm.key)}
                                    className="p-2 rounded-xl border border-red-200 dark:border-red-900/30 hover:bg-red-500/10 text-red-500 transition"
                                    title="Supprimer la permission"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* Tab Specific Toggles */}
                              {activeTab === 'permissions_role' && (
                                <div className="w-16 flex justify-end">
                                  {isSaving ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                  ) : (
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!!rolePermissions[perm.key]}
                                        onChange={() => handleToggleRolePermission(perm.key, !!rolePermissions[perm.key])}
                                        className="sr-only peer"
                                      />
                                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isDarkMode
                                          ? 'bg-[#252a37] peer-checked:bg-amber-400'
                                          : 'bg-slate-200 peer-checked:bg-slate-900'
                                        }`}></div>
                                    </label>
                                  )}
                                </div>
                              )}

                              {activeTab === 'exceptions_user' && (
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
                                  {(['inherited', 'authorized', 'forbidden'] as const).map((status) => {
                                    const currentStatus = userPermissions[perm.key]?.status || 'inherited'
                                    const isSelected = currentStatus === status

                                    let label = 'Hérité'
                                    let btnClass = 'text-slate-500'
                                    if (status === 'authorized') {
                                      label = 'Autorisé'
                                      if (isSelected) btnClass = 'bg-emerald-500 text-white shadow'
                                    } else if (status === 'forbidden') {
                                      label = 'Interdit'
                                      if (isSelected) btnClass = 'bg-rose-500 text-white shadow'
                                    } else {
                                      if (isSelected) btnClass = 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white shadow'
                                    }

                                    return (
                                      <button
                                        key={status}
                                        onClick={() => handleUpdateUserPermission(perm.key, status)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${btnClass}`}
                                      >
                                        {label}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* TAB: LECTURE METIER (MATRIX VIEW) */
              <div className={`rounded-3xl border p-6 overflow-hidden ${cardTheme}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b ${borderTheme}`}>
                        <th className={`pb-4 text-[10px] font-black uppercase tracking-widest ${descTheme} min-w-[200px]`}>
                          Module & Permission
                        </th>
                        {SYSTEM_ROLES.map(role => (
                          <th key={role} className={`pb-4 px-3 text-center text-[9px] font-black uppercase tracking-wider ${descTheme} min-w-[80px]`}>
                            {ROLE_LABELS[role]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPermissions.map((perm) => {
                        return (
                          <tr key={perm.key} className={`transition ${hoverRowTheme}`}>
                            <td className="py-4 pr-4">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                {MODULES_LIST.find(m => m.id === perm.module)?.name || perm.module}
                              </span>
                              <p className={`text-xs font-black uppercase tracking-wider mt-0.5 ${titleTheme}`}>
                                {perm.name}
                              </p>
                              <p className={`text-[10px] font-semibold ${descTheme} line-clamp-1`}>
                                {perm.desc}
                              </p>
                            </td>
                            {SYSTEM_ROLES.map((role) => {
                              const hasAccess = DEFAULT_PERMISSIONS[role]?.[perm.key] ?? false
                              return (
                                <td key={role} className="py-4 px-3 text-center">
                                  <div className="flex justify-center">
                                    {hasAccess ? (
                                      <Check className="w-4 h-4 text-emerald-500 font-bold" />
                                    ) : (
                                      <X className="w-4 h-4 text-rose-500 font-bold" />
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg p-6 rounded-3xl border transition-all ${cardTheme} shadow-2xl`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 dark:border-slate-800">
              <h3 className={`text-sm font-black uppercase tracking-widest ${titleTheme}`}>
                {modalMode === 'create' ? 'Créer une permission personnalisée' : 'Modifier la permission'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 ${borderTheme}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveCustomPermission} className="space-y-4">
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
                  Clé technique (unique) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs font-bold text-slate-400">custom.</span>
                  <input
                    type="text"
                    required
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="ma_permission"
                    disabled={modalMode === 'edit'}
                    className={`w-full pl-16 pr-4 py-3 text-xs rounded-2xl border outline-none font-semibold transition ${isDarkMode
                        ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                        : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
                  Nom d'affichage *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Modifier les tarifs de nuit"
                  className={`w-full px-4 py-3 text-xs rounded-2xl border outline-none font-semibold transition ${isDarkMode
                      ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                      : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
                  Description détaillée *
                </label>
                <textarea
                  required
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Décrivez précisément ce que cette règle autorise."
                  rows={3}
                  className={`w-full px-4 py-3 text-xs rounded-2xl border outline-none font-semibold transition ${isDarkMode
                      ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                      : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${descTheme}`}>
                  Module de rattachement *
                </label>
                <select
                  value={customModule}
                  onChange={(e) => setCustomModule(e.target.value)}
                  className={`w-full px-4 py-3 text-xs rounded-2xl border outline-none font-semibold cursor-pointer ${isDarkMode ? 'bg-[#0f1115] border-[#252a37] text-white' : 'bg-slate-50 border-[#cbd5e1] text-slate-800'
                    }`}
                >
                  {MODULES_LIST.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border hover:bg-slate-50 dark:hover:bg-slate-800 ${borderTheme}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-2xl shadow-lg hover:from-amber-600 hover:to-orange-700 transition"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
