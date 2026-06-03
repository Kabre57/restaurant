'use client'

import React from 'react'
import { Archive, AlertTriangle, BarChart2, Search, Edit2, Trash2 } from 'lucide-react'
import { InventoryData } from '../hooks/useInventory'

interface Props {
  totalIngredients: number
  lowStockCount: number
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredInventories: InventoryData[]
  setEditingInventory: (inventory: InventoryData | null) => void
  handleDelete: (id: string) => void
  isDeleting: string | null
}

export function LevelsTab({
  totalIngredients,
  lowStockCount,
  searchQuery,
  setSearchQuery,
  filteredInventories,
  setEditingInventory,
  handleDelete,
  isDeleting
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn">
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

      {/* Table */}
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
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {filteredInventories.map((item) => {
                  const isLow = item.quantity < item.minStock
                  return (
                    <tr key={item.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                      <td className="py-4 font-black text-black">{item.ingredient.name}</td>
                      <td className="py-4 font-bold text-black">{item.store.name}</td>
                      <td className={`py-4 font-black ${isLow ? 'text-red-500' : 'text-[#FF6D00]'}`}>{item.quantity}</td>
                      <td className="py-4 text-[#868e96] font-bold">{item.minStock}</td>
                      <td className="py-4 font-bold text-black">{item.ingredient.unit}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                          isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isLow ? 'Critique' : 'Normal'}
                        </span>
                      </td>
                      <td className="py-4 text-[#868e96]">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingInventory(item)}
                            className="flex h-8 px-3 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-[#171717] bg-[#F8F9FA] border border-[#E5E7EB] hover:border-[#171717] transition-all"
                          >
                            <Edit2 className="h-3 w-3" />
                            Ajuster
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting === item.id}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#adb5bd] hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
  )
}
