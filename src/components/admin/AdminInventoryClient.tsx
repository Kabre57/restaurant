'use client'

import React, { useState } from 'react'
import { Archive, Plus, AlertTriangle, BarChart2, Search } from 'lucide-react'
import { AddIngredientModal } from './subcomponents/AddIngredientModal'

type InventoryData = {
  id: string
  quantity: number
  minStock: number
  lastUpdated: Date
  ingredient: { name: string; unit: string }
  store: { name: string }
}

interface Props {
  totalIngredients: number
  lowStockCount: number
  inventories: InventoryData[]
  stores: { id: string, name: string }[]
  refreshDataAction: () => void
}

export function AdminInventoryClient({ totalIngredients, lowStockCount, inventories, stores, refreshDataAction }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredInventories = inventories.filter(item =>
    item.ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.store.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">LOGISTIQUE CENTRALE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Gestion de l'Inventaire
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Suivi des stocks d'ingrédients, alertes de rupture et états de réapprovisionnement par restaurant.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all"
        >
          <Plus className="h-4 w-4" />
          Ajouter Ingrédient
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Total Références</span>
            <div className="rounded-xl bg-[#FF6D00]/10 p-2.5 text-[#FF6D00]">
              <Archive className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{totalIngredients}</span>
            <span className="text-xs font-bold text-[#868e96]">Ingrédients enregistrés</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Alertes Ruptures</span>
            <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{lowStockCount}</span>
            <span className="text-xs font-black text-red-600 uppercase tracking-widest">A commander</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Taux Disponibilité</span>
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-500">
              <BarChart2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">94.8%</span>
            <span className="text-xs font-bold text-green-600">Optimal</span>
          </div>
        </div>
      </div>

      {/* Inventory Table Section */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-base font-black text-black">Niveaux de Stocks Actuels</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un ingrédient..."
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-2 pl-10 pr-4 text-xs font-bold text-black outline-none placeholder-[#adb5bd] focus:border-[#FF6D00]"
            />
          </div>
        </div>

        {filteredInventories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center">
            <Archive className="mx-auto h-10 w-10 text-[#adb5bd]" />
            <p className="mt-4 text-sm font-black text-black">Inventaire vide ou aucun résultat</p>
            <p className="text-xs font-bold text-[#868e96]">Ajoutez des ingrédients pour suivre les stocks de vos restaurants.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-[#495057]">
              <thead>
                <tr className="border-b border-[#F0F1F6] text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                  <th className="pb-4">Ingrédient</th>
                  <th className="pb-4">Restaurant</th>
                  <th className="pb-4">Quantité en stock</th>
                  <th className="pb-4">Stock de sécurité min.</th>
                  <th className="pb-4">Unité</th>
                  <th className="pb-4">Statut</th>
                  <th className="pb-4">Dernière mise à jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {filteredInventories.map((item) => {
                  const isLow = item.quantity < item.minStock
                  return (
                    <tr key={item.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                      <td className="py-4 font-black text-black">{item.ingredient.name}</td>
                      <td className="py-4 font-bold text-black">{item.store.name}</td>
                      <td className={`py-4 font-black F CFA {isLow ? 'text-red-500' : 'text-[#FF6D00]'}`}>{item.quantity}</td>
                      <td className="py-4 text-[#868e96] font-bold">{item.minStock}</td>
                      <td className="py-4 font-bold text-black">{item.ingredient.unit}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest F CFA {
                          isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isLow ? 'Critique' : 'Normal'}
                        </span>
                      </td>
                      <td className="py-4 text-[#868e96]">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddIngredientModal
          stores={stores}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
