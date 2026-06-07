'use client'

import React, { useState, useEffect } from 'react'
import { Shield, ShieldAlert, RefreshCw, Loader2, Sun, Moon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getRolePermissions, updateRolePermission, resetRolePermissions } from '@/app/actions/permissions'
import { PERMISSIONS_LIST } from '@/app/utils/permissions-config'
import { Role } from '@prisma/client'

export default function AccessRightsDashboard() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [selectedRole, setSelectedRole] = useState<Role>('CASHIER')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Load theme preference from localStorage on mount and sync on storage events
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
    
    // Dispatch a storage event so layout or other elements hear it
    window.dispatchEvent(new Event('storage'))
  }

  const roleMeta: Record<Role, { title: string; desc: string }> = {
    RESTAURATEUR: { title: 'Manager / Propriétaire', desc: 'Accès complet à la gestion du personnel, des stocks, des statistiques et de la configuration.' },
    MANAGER: { title: 'Gérant', desc: 'Gestion opérationnelle, des stocks et du personnel, hors modifications d\'intégrations API.' },
    CASHIER: { title: 'Caissier(ère)', desc: 'Prend en charge les ventes sur le POS, l\'ouverture du tiroir-caisse et l\'impression des reçus.' },
    SERVER: { title: 'Serveur', desc: 'Prend les commandes à table via l\'interface POS mobile et gère le plan de salle.' },
    KITCHEN: { title: 'Cuisinier(ère)', desc: 'Utilise l\'écran de cuisine (KDS) pour suivre et finaliser les préparations de plats.' },
    DELIVERY: { title: 'Livreur', desc: 'Accède aux commandes en attente de livraison et valide les statuts de livraison.' },
    ADMIN: { title: 'Administrateur Plateforme', desc: 'Droits complets d\'administration technique globale.' }
  }

  const loadPermissions = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const data = await getRolePermissions(storeId, selectedRole)
      setPermissions(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      void loadPermissions()
    }
  }, [storeId, selectedRole])

  const handleTogglePermission = async (key: string, currentValue: boolean) => {
    if (!storeId) return
    try {
      setSavingKey(key)
      const res = await updateRolePermission(storeId, selectedRole, key, !currentValue)
      if (res.success) {
        setPermissions((prev) => ({
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

  const handleResetToDefaults = async () => {
    if (!storeId) return
    try {
      setIsResetting(true)
      const res = await resetRolePermissions(storeId, selectedRole)
      if (res.success) {
        await loadPermissions()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsResetting(false)
    }
  }

  // Theme-specific styles
  const bgTheme = isDarkMode ? 'bg-[#0f1115] text-[#eceff4]' : 'bg-[#f8f9fa] text-[#212529]'
  const cardTheme = isDarkMode ? 'bg-[#181a20] border-[#2e3440]' : 'bg-white border-[#dee2e6]'
  const titleTheme = isDarkMode ? 'text-white' : 'text-[#212529]'
  const descTheme = isDarkMode ? 'text-[#8c96a5]' : 'text-[#495057]'
  const tableHeadTheme = isDarkMode ? 'text-[#8c96a5] border-[#2e3440]' : 'text-[#adb5bd] border-[#dee2e6]'
  const tableRowHover = isDarkMode ? 'hover:bg-[#1e222b]' : 'hover:bg-[#fafbfc]'
  const borderTheme = isDarkMode ? 'border-[#2e3440]' : 'border-[#dee2e6]'

  return (
    <div className={`min-h-screen transition-all duration-300 p-4 sm:p-6 lg:p-8 ${bgTheme}`}>
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`text-2xl font-black tracking-tight uppercase sm:text-3xl ${titleTheme}`}>
              Droits d'accès
            </h1>
            <p className="text-[#adb5bd] text-xs font-bold uppercase tracking-widest mt-1">
              Personnalisez les permissions par rôle (cochez/décochez les accès)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-2xl transition-all shadow-sm border ${
                isDarkMode 
                  ? 'bg-[#2b303c] border-[#2e3440] text-yellow-400' 
                  : 'bg-white border-[#dee2e6] text-[#212529] hover:bg-[#f8f9fa]'
              }`}
              title={isDarkMode ? 'Passer au Mode Clair' : 'Passer au Mode Sombre'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              disabled={loading || isResetting}
              onClick={handleResetToDefaults}
              className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-sm border ${
                isDarkMode 
                  ? 'bg-[#181a20] border-[#2e3440] text-[#eceff4] hover:bg-[#2b303c]' 
                  : 'bg-white border-[#dee2e6] text-[#212529] hover:bg-[#f8f9fa]'
              }`}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#adb5bd]" />
              ) : (
                <RefreshCw className="h-4 w-4 text-[#adb5bd]" />
              )}
              Défaut
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Role Selector */}
          <div className="space-y-4 lg:col-span-1">
            <div className={`rounded-[2rem] border p-6 shadow-sm ${cardTheme}`}>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#adb5bd] mb-4">
                Sélectionner un Rôle
              </h2>
              <div className="space-y-3">
                {(['CASHIER', 'SERVER', 'KITCHEN', 'DELIVERY', 'MANAGER', 'RESTAURATEUR'] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedRole === r
                        ? isDarkMode 
                          ? 'border-amber-400 bg-[#2b303c] text-amber-400 shadow-lg'
                          : 'border-[#212529] bg-[#212529] text-white shadow-lg'
                        : isDarkMode
                          ? 'border-[#2e3440] bg-[#12141c] text-[#eceff4] hover:bg-[#1e222b]'
                          : 'border-[#dee2e6] bg-white text-[#495057] hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">{roleMeta[r]?.title || r}</p>
                        <p className={`text-[10px] mt-0.5 ${selectedRole === r ? 'opacity-80' : 'text-[#adb5bd]'}`}>
                          Loyverse POS Standard
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Role Details Card */}
            <div className={`rounded-[2rem] border p-6 shadow-xl ${
              isDarkMode ? 'bg-[#1e222b] border-[#2e3440] text-[#eceff4]' : 'bg-[#212529] border-[#212529] text-white'
            }`}>
              <ShieldAlert className="h-8 w-8 text-[#FF6D00] mb-4" />
              <h3 className="text-sm font-black uppercase tracking-wider mb-2">Description du Rôle</h3>
              <p className={`text-xs leading-relaxed font-semibold ${isDarkMode ? 'text-white/80' : 'text-white/90'}`}>
                {roleMeta[selectedRole]?.desc || 'Aucune description disponible'}
              </p>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">Niveau de sécurité</span>
                <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                  {selectedRole === 'RESTAURATEUR' || selectedRole === 'ADMIN' ? 'ADMINISTRATEUR' : 'RESTREINT'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Privileges Table with Checkboxes */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`rounded-[2rem] border p-6 shadow-sm overflow-hidden ${cardTheme}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-sm font-black uppercase tracking-widest ${titleTheme}`}>
                  Configuration des accès
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                  Filtre : {roleMeta[selectedRole]?.title || selectedRole}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${tableHeadTheme}`}>
                        <th className="pb-4">Module / Fonctionnalité</th>
                        <th className="pb-4">Description</th>
                        <th className="pb-4 text-center">Autorisé</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-[#2e3440]' : 'divide-[#f1f3f5]'}`}>
                      {PERMISSIONS_LIST.map((perm) => {
                        const hasAccess = !!permissions[perm.key]
                        const isSaving = savingKey === perm.key
                        return (
                          <tr key={perm.key} className={`transition ${tableRowHover}`}>
                            <td className="py-4 pr-4">
                              <p className={`text-xs font-black uppercase tracking-wider ${titleTheme}`}>
                                {perm.name}
                              </p>
                            </td>
                            <td className={`py-4 pr-4 text-xs font-bold max-w-[250px] leading-relaxed ${descTheme}`}>
                              {perm.desc}
                            </td>
                            <td className="py-4 text-center">
                              <div className="inline-flex items-center justify-center">
                                {isSaving ? (
                                  <Loader2 className="h-6 w-6 animate-spin text-[#FF6D00]" />
                                ) : (
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={hasAccess}
                                      onChange={() => handleTogglePermission(perm.key, hasAccess)}
                                      className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                                      isDarkMode
                                        ? 'bg-[#2b303c] peer-checked:bg-amber-400'
                                        : 'bg-[#dee2e6] peer-checked:bg-[#212529]'
                                    }`}></div>
                                  </label>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
