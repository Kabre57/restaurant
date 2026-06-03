'use client'

import React from 'react'
import { Loader2, DollarSign, TrendingUp, Percent, FileText, SlidersHorizontal } from 'lucide-react'
import { InventoryData } from '../hooks/useInventory'

interface Props {
  isLoadingAsync: boolean
  valuation: any
  inventories: InventoryData[]
  openPricingModal: (ing: { id: string; name: string; costPrice: number; sellPrice: number }) => void
}

export function ValuationTab({
  isLoadingAsync,
  valuation,
  inventories,
  openPricingModal
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Valuation Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Cost Value */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Valeur au Coût d'Achat</span>
            <div className="rounded-xl bg-orange-500/10 p-2.5 text-[#FF6D00]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">
              {(valuation?.totalCostValue || 0).toLocaleString()} F CFA
            </span>
            <span className="text-xs font-bold text-[#868e96]">Coût total</span>
          </div>
        </div>

        {/* Potential Retail Value */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Valeur Potentielle de Vente</span>
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">
              {(valuation?.totalPotentialSellValue || 0).toLocaleString()} F CFA
            </span>
            <span className="text-xs font-bold text-green-600">Revenu attendu</span>
          </div>
        </div>

        {/* Potential Profit */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Marge / Profit Potentiel</span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">
              {(valuation?.totalPotentialProfit || 0).toLocaleString()} F CFA
            </span>
            <span className="text-xs font-bold text-purple-600">Marge brute</span>
          </div>
        </div>
      </div>

      {/* Valuation Table */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
        <h2 className="text-base font-black text-black mb-6">Évaluation Détaillée de l'Inventaire</h2>
        {isLoadingAsync ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto h-8 w-8 text-[#FF6D00] animate-spin" />
            <p className="mt-4 text-xs font-bold text-[#868e96]">Calcul de la valeur des stocks...</p>
          </div>
        ) : !valuation || valuation.items.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-[#E5E7EB] rounded-2xl">
            <FileText className="mx-auto h-8 w-8 text-[#adb5bd]" />
            <p className="mt-4 text-sm font-black text-[#171717]">Aucune évaluation possible</p>
            <p className="text-xs font-bold text-[#868e96]">Ajoutez des prix d'achat/vente à vos ingrédients.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-[#495057]">
              <thead>
                <tr className="border-b border-[#F0F1F6] text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                  <th className="pb-4">Ingrédient</th>
                  <th className="pb-4">Restaurant</th>
                  <th className="pb-4">Stock</th>
                  <th className="pb-4">Coût Unitaire</th>
                  <th className="pb-4">Prix Vente Est.</th>
                  <th className="pb-4">Valeur Coût</th>
                  <th className="pb-4">Valeur Vente</th>
                  <th className="pb-4">Marge Est.</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {valuation.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                    <td className="py-4 font-black text-black">{item.ingredientName}</td>
                    <td className="py-4 font-bold text-black">{item.storeName}</td>
                    <td className="py-4 font-black text-black">{item.quantity} {item.unit}</td>
                    <td className="py-4 text-[#868e96] font-bold">{item.costPrice.toLocaleString()} F CFA</td>
                    <td className="py-4 text-[#868e96] font-bold">{item.sellPrice.toLocaleString()} F CFA</td>
                    <td className="py-4 font-black text-black">{item.costValue.toLocaleString()} F CFA</td>
                    <td className="py-4 font-black text-[#FF6D00]">{item.sellValue.toLocaleString()} F CFA</td>
                    <td className={`py-4 font-bold ${item.potentialProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.potentialProfit.toLocaleString()} F CFA
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => openPricingModal({
                          id: inventories.find(inv => inv.id === item.id)?.ingredient.id || '',
                          name: item.ingredientName,
                          costPrice: item.costPrice,
                          sellPrice: item.sellPrice
                        })}
                        className="flex h-8 px-3 ml-auto items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-[#FF6D00] bg-orange-50 hover:bg-orange-100 transition-all border border-orange-200"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Prix
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
