'use client'

import React from 'react'
import {
  Shield,
  RefreshCw,
  Loader2,
  Sun,
  Moon,
  Search,
  Plus,
  Users,
  Settings,
  AlertCircle,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react'
import { Role } from '@prisma/client'
import { MODULES_LIST, DEFAULT_PERMISSIONS } from '@/app/utils/permissions-config'

import { SYSTEM_ROLES, ROLE_LABELS } from './types'
import { useRightsActions } from './hooks/useRightsActions'
import { useRightsSearch } from './hooks/useRightsSearch'
import RolePermissionsTab from './components/RolePermissionsTab'
import UserExceptionsTab from './components/UserExceptionsTab'
import MatrixViewTab from './components/MatrixViewTab'
import CustomPermissionModal from './components/CustomPermissionModal'

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function AccessRightsDashboard() {
  const {
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
  } = useRightsActions()

  const {
    searchQuery,
    setSearchQuery,
    activeModule,
    setActiveModule,
    filteredPermissions,
    fullList,
    getActiveCountForModule
  } = useRightsSearch(customPermissions, rolePermissions, userPermissions, activeTab)

  const activeCount = Object.values(rolePermissions).filter(Boolean).length

  const bgTheme = isDarkMode ? 'bg-[#0b0c10] text-[#eceff4]' : 'bg-[#f4f6f9] text-[#212529]'
  const cardTheme = isDarkMode ? 'bg-[#151821] border-[#252a37] shadow-xl' : 'bg-white border-[#e3e8f0] shadow-sm'
  const titleTheme = isDarkMode ? 'text-white' : 'text-[#1a202c]'
  const descTheme = isDarkMode ? 'text-[#9faab7]' : 'text-[#64748b]'
  const borderTheme = isDarkMode ? 'border-[#252a37]' : 'border-[#e3e8f0]'
  const hoverRowTheme = isDarkMode ? 'hover:bg-[#1a1e2a]' : 'hover:bg-slate-50'
  const badgeTheme = (category: string) => {
    if (category === 'system') return isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
    if (category === 'custom') return isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
    return isDarkMode ? 'bg-slate-500/10 text-slate-300' : 'bg-slate-100 text-slate-600'
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
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-2xl transition-all border shadow-sm ${
                isDarkMode
                  ? 'bg-[#1e2230] border-[#2d334a] text-amber-400 hover:bg-[#282e42]'
                  : 'bg-white border-[#cbd5e1] text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={loadInitialData}
              className={`p-3 rounded-2xl transition-all border shadow-sm ${
                isDarkMode
                  ? 'bg-[#1e2230] border-[#2d334a] text-slate-200 hover:bg-[#282e42]'
                  : 'bg-white border-[#cbd5e1] text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => openCreateModal(activeModule)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold uppercase tracking-wider text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 hover:from-amber-600 hover:to-orange-700 transition"
            >
              <Plus className="w-4 h-4" />
              Nouvelle permission
            </button>
          </div>
        </div>

        {/* STATISTICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-3xl border flex items-center justify-between ${cardTheme}`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${descTheme}`}>
                Permissions système
              </span>
              <h3 className={`text-2xl font-black ${titleTheme}`}>
                {activeTab === 'permissions_role' ? `${activeCount} / ${fullList.length}` : `${fullList.length} Actives`}
              </h3>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          <div className={`p-6 rounded-3xl border flex items-center justify-between ${cardTheme}`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${descTheme}`}>
                Modules Opérationnels
              </span>
              <h3 className={`text-2xl font-black ${titleTheme}`}>{MODULES_LIST.length} Domaines</h3>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <Settings className="w-6 h-6" />
            </div>
          </div>

          <div className={`p-6 rounded-3xl border flex items-center justify-between ${cardTheme}`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${descTheme}`}>
                Rôles Système
              </span>
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
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setActiveTab('permissions_role')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  activeTab === 'permissions_role'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Permissions par rôle
              </button>
              <button
                onClick={() => setActiveTab('exceptions_user')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  activeTab === 'exceptions_user'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Exceptions utilisateur
              </button>
              <button
                onClick={() => setActiveTab('lecture_metier')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  activeTab === 'lecture_metier'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Lecture métier
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une permission, description ou sous-module..."
                className={`w-full pl-10 pr-4 py-3 text-xs rounded-2xl border outline-none font-medium transition ${
                  isDarkMode
                    ? 'bg-[#0f1115] border-[#252a37] text-white focus:border-amber-500'
                    : 'bg-slate-50 border-[#cbd5e1] text-slate-800 focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          {activeTab === 'permissions_role' && (
            <div
              className={`mt-4 p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDarkMode ? 'bg-[#1c1f2a] border-[#2b3145]' : 'bg-slate-50 border-[#cbd5e1]'
              }`}
            >
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  Configurer le rôle :
                </span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${
                    isDarkMode ? 'bg-[#151821] border-[#2d334a] text-white' : 'bg-white border-[#cbd5e1] text-slate-800'
                  }`}
                >
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] || r}
                    </option>
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
            <div
              className={`mt-4 p-5 rounded-2xl border flex flex-col md:flex-row md:items-center gap-4 ${
                isDarkMode ? 'bg-[#1c1f2a] border-[#2b3145]' : 'bg-slate-50 border-[#cbd5e1]'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500 shrink-0">
                Sélectionner un collaborateur :
              </span>
              {staffList.length === 0 ? (
                <span className="text-xs font-semibold text-slate-500">Aucun employé enregistré</span>
              ) : (
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${
                    isDarkMode ? 'bg-[#151821] border-[#2d334a] text-white' : 'bg-white border-[#cbd5e1] text-slate-800'
                  }`}
                >
                  {staffList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({ROLE_LABELS[u.role] || u.role})
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
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Chargement des autorisations...
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'permissions_role' && (
              <RolePermissionsTab
                isDarkMode={isDarkMode}
                rolePermissions={rolePermissions}
                filteredPermissions={filteredPermissions}
                fullList={fullList}
                activeModule={activeModule}
                searchQuery={searchQuery}
                savingKey={savingKey}
                customPermissions={customPermissions}
                setActiveModule={setActiveModule}
                setSearchQuery={setSearchQuery}
                getActiveCountForModule={getActiveCountForModule}
                handleToggleRolePermission={handleToggleRolePermission}
                openEditModal={openEditModal}
                handleDeleteCustomPermission={handleDeleteCustomPermission}
              />
            )}

            {activeTab === 'exceptions_user' && (
              <UserExceptionsTab
                isDarkMode={isDarkMode}
                userPermissions={userPermissions}
                filteredPermissions={filteredPermissions}
                fullList={fullList}
                activeModule={activeModule}
                searchQuery={searchQuery}
                savingKey={savingKey}
                customPermissions={customPermissions}
                setActiveModule={setActiveModule}
                setSearchQuery={setSearchQuery}
                getActiveCountForModule={getActiveCountForModule}
                handleUpdateUserPermission={handleUpdateUserPermission}
                openEditModal={openEditModal}
                handleDeleteCustomPermission={handleDeleteCustomPermission}
              />
            )}

            {activeTab === 'lecture_metier' ? (
              <>
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
                            </div>

                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>

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
                  Nom d'affichage *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => {
                    const name = e.target.value
                    setCustomName(name)
                    if (modalMode === 'create') {
                      setCustomKey(generateSlug(name))
                    }
                  }}
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
