import React from 'react'
import {
  AlertCircle,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react'
import { PermissionItem, MODULES_LIST } from '@/app/utils/permissions-config'

interface CustomPermission {
  id: string
  permissionKey: string
  name: string
  desc: string
  module: string
}

interface RolePermissionsTabProps {
  isDarkMode: boolean
  rolePermissions: Record<string, boolean>
  filteredPermissions: PermissionItem[]
  fullList: PermissionItem[]
  activeModule: string
  searchQuery: string
  savingKey: string | null
  customPermissions: CustomPermission[]
  setActiveModule: (mod: string) => void
  setSearchQuery: (query: string) => void
  getActiveCountForModule: (mod: string) => number
  handleToggleRolePermission: (key: string, currentValue: boolean) => Promise<void>
  openEditModal: (item: CustomPermission) => void
  handleDeleteCustomPermission: (key: string) => Promise<void>
}

export default function RolePermissionsTab({
  isDarkMode,
  rolePermissions,
  filteredPermissions,
  fullList,
  activeModule,
  searchQuery,
  savingKey,
  customPermissions,
  setActiveModule,
  setSearchQuery,
  getActiveCountForModule,
  handleToggleRolePermission,
  openEditModal,
  handleDeleteCustomPermission
}: RolePermissionsTabProps) {
  const cardTheme = isDarkMode ? 'bg-[#151821] border-[#252a37] shadow-xl' : 'bg-white border-[#e3e8f0] shadow-sm'
  const titleTheme = isDarkMode ? 'text-white' : 'text-[#1a202c]'
  const descTheme = isDarkMode ? 'text-[#9faab7]' : 'text-[#64748b]'
  const hoverRowTheme = isDarkMode ? 'hover:bg-[#1a1e2a]' : 'hover:bg-[#f8fafc]'

  const badgeTheme = (cat: string) => {
    if (cat === 'Personnalisé') return 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
    if (cat === 'Lecture') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
    if (cat === 'Actions') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
    return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
  }

  return (
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
              const total = fullList.filter((p) => p.module === mod.id).length
              const isSelected = activeModule === mod.id && !searchQuery

              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    setActiveModule(mod.id)
                    setSearchQuery('')
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 shrink-0 lg:shrink ${
                    isSelected
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
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
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
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Aucune permission ne correspond à votre recherche.
            </p>
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
                    {isCustom && (
                      <div className="flex items-center gap-1.5 mr-2">
                        <button
                          onClick={() => {
                            const c = customPermissions.find((cp) => cp.permissionKey === perm.key)
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
                          <div
                            className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                              isDarkMode ? 'bg-[#252a37] peer-checked:bg-amber-400' : 'bg-slate-200 peer-checked:bg-slate-900'
                            }`}
                          ></div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
