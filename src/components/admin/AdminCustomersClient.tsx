'use client'

import React, { useState } from 'react'
import { Users, Award, Zap, Search, Plus } from 'lucide-react'
import { AddCustomerModal } from './subcomponents/AddCustomerModal'

type CustomerData = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  createdAt: Date
  loyalty: { points: number } | null
  orders: { id: string; total: number }[]
}

interface Props {
  totalCustomersCount: number
  averagePoints: number
  customers: CustomerData[]
  refreshDataAction: () => void
  activeStoreId?: string
}

export function AdminCustomersClient({ totalCustomersCount, averagePoints, customers, refreshDataAction, activeStoreId }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredCustomers = customers.filter(c =>
    c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
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
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">RELAXATION & FIDÉLITÉ</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Gestion des Clients
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Suivi du portefeuille de clients, des points de fidélité cumulés et du volume de dépenses.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all"
        >
          <Plus className="h-4 w-4" />
          Enregistrer Client
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Clients Enregistrés</span>
            <div className="rounded-xl bg-[#FF6D00]/10 p-2.5 text-[#FF6D00]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{totalCustomersCount}</span>
            <span className="text-xs font-bold text-green-600">+15% ce mois</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Moyenne Points Fidélité</span>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{averagePoints} pts</span>
            <span className="text-xs font-bold text-amber-500">Par client</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Score NPS Moyen</span>
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-500">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">4.8 / 5</span>
            <span className="text-xs font-bold text-green-600">Excellent</span>
          </div>
        </div>
      </div>

      {/* Customers Table Section */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-base font-black text-black">Liste des Clients Enregistrés</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-2 pl-10 pr-4 text-xs font-bold text-black outline-none placeholder-[#adb5bd] focus:border-[#FF6D00]"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-[#adb5bd]" />
            <p className="mt-4 text-sm font-black text-black">Aucun client trouvé</p>
            <p className="text-xs font-bold text-[#868e96]">Les clients créant des comptes apparaîtront ici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-[#495057]">
              <thead>
                <tr className="border-b border-[#F0F1F6] text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                  <th className="pb-4">Nom Complet</th>
                  <th className="pb-4">Email</th>
                  <th className="pb-4">Téléphone</th>
                  <th className="pb-4">Commandes passées</th>
                  <th className="pb-4">Total Dépenses</th>
                  <th className="pb-4">Points Fidélité</th>
                  <th className="pb-4">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {filteredCustomers.map((c) => {
                  const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0)
                  return (
                    <tr key={c.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                      <td className="py-4 font-black text-black">{c.firstName} {c.lastName}</td>
                      <td className="py-4 text-[#868e96] font-bold">{c.email || 'Non renseigné'}</td>
                      <td className="py-4 text-[#868e96] font-bold">{c.phone || 'Non renseigné'}</td>
                      <td className="py-4 font-bold text-black">{c.orders.length}</td>
                      <td className="py-4 font-black text-[#FF6D00]">{totalSpent.toLocaleString()} F CFA </td>
                      <td className="py-4">
                        <span className="rounded-lg bg-amber-500/10 px-2 py-1 font-black text-amber-600">
                          {c.loyalty?.points || 0} pts
                        </span>
                      </td>
                      <td className="py-4 text-[#868e96]">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddCustomerModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
          storeId={activeStoreId}
        />
      )}
    </div>
  )
}
