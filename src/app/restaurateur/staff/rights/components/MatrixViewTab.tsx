import React from 'react'
import { Check, X } from 'lucide-react'
import { Role } from '@prisma/client'
import { PermissionItem, MODULES_LIST } from '@/app/utils/permissions-config'

interface MatrixViewTabProps {
  isDarkMode: boolean
  filteredPermissions: PermissionItem[]
  systemRoles: Role[]
  roleLabels: Record<Role, string>
  defaultPermissions: Record<Role, Record<string, boolean>>
}

export default function MatrixViewTab({
  isDarkMode,
  filteredPermissions,
  systemRoles,
  roleLabels,
  defaultPermissions
}: MatrixViewTabProps) {
  const cardTheme = isDarkMode ? 'bg-[#151821] border-[#252a37] shadow-xl' : 'bg-white border-[#e3e8f0] shadow-sm'
  const titleTheme = isDarkMode ? 'text-white' : 'text-[#1a202c]'
  const descTheme = isDarkMode ? 'text-[#9faab7]' : 'text-[#64748b]'
  const borderTheme = isDarkMode ? 'border-[#252a37]' : 'border-[#e2e8f0]'
  const hoverRowTheme = isDarkMode ? 'hover:bg-[#1a1e2a]' : 'hover:bg-[#f8fafc]'

  return (
    <div className={`rounded-3xl border p-6 overflow-hidden ${cardTheme}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b ${borderTheme}`}>
              <th className={`pb-4 text-[10px] font-black uppercase tracking-widest ${descTheme} min-w-[200px]`}>
                Module & Permission
              </th>
              {systemRoles.map((role) => (
                <th
                  key={role}
                  className={`pb-4 px-3 text-center text-[9px] font-black uppercase tracking-wider ${descTheme} min-w-[80px]`}
                >
                  {roleLabels[role] || role}
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
                      {MODULES_LIST.find((m) => m.id === perm.module)?.name || perm.module}
                    </span>
                    <p className={`text-xs font-black uppercase tracking-wider mt-0.5 ${titleTheme}`}>
                      {perm.name}
                    </p>
                    <p className={`text-[10px] font-semibold ${descTheme} line-clamp-1`}>
                      {perm.desc}
                    </p>
                  </td>
                  {systemRoles.map((role) => {
                    const hasAccess = defaultPermissions[role]?.[perm.key] ?? false
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
  )
}
