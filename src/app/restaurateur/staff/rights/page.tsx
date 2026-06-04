'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Check, X, ShieldAlert, Key, Users, Settings, Sliders, ShoppingBag, Eye, RefreshCw, Loader2, Save } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getRolePermissions, updateRolePermission, resetRolePermissions, PERMISSIONS_LIST } from '@/app/actions/permissions'
import { Role } from '@prisma/client'

export default function AccessRightsDashboard() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [selectedRole, setSelectedRole] = useState<Role>('CASHIER')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Droits d'accès</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Personnalisez les permissions par rôle (cochez/décochez les accès ci-dessous)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={loading || isResetting}
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-2 bg-[#f8f9fa] border border-[#dee2e6] hover:bg-[#e9ecef] text-[#212529] text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-sm"
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#adb5bd]" />
            ) : (
              <RefreshCw className="h-4 w-4 text-[#adb5bd]" />
            )}
            Restaurer les configurations par défaut
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Role Selector */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#adb5bd] mb-4">Sélectionner un Rôle</h2>
            <div className="space-y-3">
              {(['CASHIER', 'SERVER', 'KITCHEN', 'DELIVERY', 'MANAGER', 'RESTAURATEUR'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedRole === r
                      ? 'border-[#212529] bg-[#212529] text-white shadow-lg'
                      : 'border-[#dee2e6] bg-white text-[#495057] hover:bg-[#f8f9fa]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">{roleMeta[r]?.title || r}</p>
                      <p className={`text-[10px] mt-0.5 ${selectedRole === r ? 'text-white/70' : 'text-[#adb5bd]'}`}>
                        Loyverse POS Standard
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Role Details Card */}
          <div className="rounded-[2rem] border border-[#dee2e6] bg-[#212529] p-6 text-white shadow-xl">
            <ShieldAlert className="h-8 w-8 text-[#FF6D00] mb-4" />
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">Description du Rôle</h3>
            <p className="text-xs text-white/80 leading-relaxed font-semibold">
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
          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Configuration des accès</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Filtre : {roleMeta[selectedRole]?.title || selectedRole}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#dee2e6] text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                      <th className="pb-4">Module / Fonctionnalité</th>
                      <th className="pb-4">Description</th>
                      <th className="pb-4 text-center">Autorisé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f5]">
                    {PERMISSIONS_LIST.map((perm) => {
                      const hasAccess = !!permissions[perm.key]
                      const isSaving = savingKey === perm.key
                      return (
                        <tr key={perm.key} className="transition hover:bg-[#fafbfc]">
                          <td className="py-4 pr-4">
                            <p className="text-xs font-black text-[#212529] uppercase tracking-wider">{perm.name}</p>
                          </td>
                          <td className="py-4 pr-4 text-xs font-bold text-[#72788f] max-w-[250px] leading-relaxed">
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
                                  <div className="w-11 h-6 bg-[#dee2e6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#212529]"></div>
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
  )
}
