'use client'

import React, { useState } from 'react'
import { UserCheck, Shield, Plus, Search, CheckCircle2 } from 'lucide-react'
import { AddUserModal } from './subcomponents/AddUserModal'

type UserData = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
  store: { name: string } | null
}

interface Props {
  totalStaffCount: number
  cashierCount: number
  kitchenCount: number
  users: UserData[]
  stores: { id: string, name: string }[]
  refreshDataAction: () => void
}

export function AdminUsersClient({ totalStaffCount, cashierCount, kitchenCount, users, stores, refreshDataAction }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSuccess = () => {
    setIsModalOpen(false)
    refreshDataAction()
  }

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">COLLABORATEURS & DROITS</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Gestion des Utilisateurs
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Gérez les comptes d'accès de votre personnel, attribuez des rôles (Caissier, Serveur, Cuisine) et suivez l'activité.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all"
        >
          <Plus className="h-4 w-4" />
          Ajouter Collaborateur
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Staff Actif</span>
            <div className="rounded-xl bg-[#FF6D00]/10 p-2.5 text-[#FF6D00]">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{totalStaffCount}</span>
            <span className="text-xs font-bold text-green-600">Collaborateurs</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Caisse (Caissiers)</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500">
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{cashierCount}</span>
            <span className="text-xs font-bold text-blue-600">Opérateurs POS</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Cuisine (Chefs)</span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{kitchenCount}</span>
            <span className="text-xs font-bold text-purple-600">Écran KDS</span>
          </div>
        </div>
      </div>

      {/* Users Table Section */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-base font-black text-black">Comptes Utilisateurs Actifs</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un collaborateur..."
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-2 pl-10 pr-4 text-xs font-bold text-black outline-none placeholder-[#adb5bd] focus:border-[#FF6D00]"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center">
            <UserCheck className="mx-auto h-10 w-10 text-[#adb5bd]" />
            <p className="mt-4 text-sm font-black text-black">Aucun collaborateur trouvé</p>
            <p className="text-xs font-bold text-[#868e96]">Ajoutez des comptes pour votre personnel de salle et de cuisine.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-[#495057]">
              <thead>
                <tr className="border-b border-[#F0F1F6] text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                  <th className="pb-4">Nom</th>
                  <th className="pb-4">Email</th>
                  <th className="pb-4">Restaurant rattaché</th>
                  <th className="pb-4">Rôle / Accès</th>
                  <th className="pb-4">Statut</th>
                  <th className="pb-4">Date de création</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                    <td className="py-4 font-black text-black">{user.name}</td>
                    <td className="py-4 text-[#868e96] font-bold">{user.email}</td>
                    <td className="py-4 font-bold text-black">{user.store?.name || 'Multi-sites (Super-admin)'}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        user.role === 'ADMIN' ? 'bg-[#FF6D00]/10 text-[#FF6D00]' :
                        user.role === 'RESTAURATEUR' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'CASHIER' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Actif
                      </span>
                    </td>
                    <td className="py-4 text-[#868e96]">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddUserModal
          stores={stores}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
