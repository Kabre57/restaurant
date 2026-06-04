'use client'

import React from 'react'
import { SlidersHorizontal, Loader2, History } from 'lucide-react'
import { IngMvtReason } from '@prisma/client'
import { getReasonBadge } from './TransfersTab'

interface Props {
  stores: { id: string; name: string }[]
  adjustForm: {
    storeId: string
    ingredientId: string
    quantity: string
    type: 'SET' | 'DELTA'
    reason: IngMvtReason
    note: string
  }
  setAdjustForm: React.Dispatch<React.SetStateAction<{
    storeId: string
    ingredientId: string
    quantity: string
    type: 'SET' | 'DELTA'
    reason: IngMvtReason
    note: string
  }>>
  uniqueIngredients: { id: string; name: string; unit: string }[]
  isAdjusting: boolean
  adjustError: string
  adjustSuccess: boolean
  handleAdjustSubmit: (e: React.FormEvent) => void
  isLoadingAsync: boolean
  movements: any[]
}

export function AdjustmentsTab({
  stores,
  adjustForm,
  setAdjustForm,
  uniqueIngredients,
  isAdjusting,
  adjustError,
  adjustSuccess,
  handleAdjustSubmit,
  isLoadingAsync,
  movements
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Adjustment Form */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm h-fit">
        <h2 className="text-base font-black text-black mb-6">Ajustement Manuel de Stock</h2>
        <form onSubmit={handleAdjustSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Restaurant</label>
            <select
              required
              value={adjustForm.storeId}
              onChange={e => setAdjustForm({ ...adjustForm, storeId: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Ingrédient</label>
            <select
              required
              value={adjustForm.ingredientId}
              onChange={e => setAdjustForm({ ...adjustForm, ingredientId: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            >
              <option value="">-- Choisir un ingrédient --</option>
              {uniqueIngredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Type d'ajustement</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustForm({ ...adjustForm, type: 'DELTA' })}
                className={`py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  adjustForm.type === 'DELTA'
                    ? 'bg-[#171717] text-white shadow-md'
                    : 'bg-[#F8F9FA] text-[#868e96] border border-[#E5E7EB]'
                }`}
              >
                Ajouter/Soustraire
              </button>
              <button
                type="button"
                onClick={() => setAdjustForm({ ...adjustForm, type: 'SET' })}
                className={`py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  adjustForm.type === 'SET'
                    ? 'bg-[#171717] text-white shadow-md'
                    : 'bg-[#F8F9FA] text-[#868e96] border border-[#E5E7EB]'
                }`}
              >
                Fixer Quantité
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
              {adjustForm.type === 'SET' ? 'Nouvelle quantité absolue' : 'Quantité de différence (ex: -2 ou 5)'}
            </label>
            <input
              required
              type="number"
              step="0.01"
              value={adjustForm.quantity}
              onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
              placeholder={adjustForm.type === 'SET' ? "Ex: 25" : "Ex: -2.5 ou 10"}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Motif du mouvement</label>
            <select
              required
              value={adjustForm.reason}
              onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value as IngMvtReason })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            >
              <option value={IngMvtReason.ADJUSTMENT_CORRECTION}>Correction d'inventaire</option>
              <option value={IngMvtReason.ADJUSTMENT_LOSS}>Perte de stock</option>
              <option value={IngMvtReason.ADJUSTMENT_THEFT}>Vol constaté</option>
              <option value={IngMvtReason.ADJUSTMENT_WASTE}>Casse / Abîmé</option>
              <option value={IngMvtReason.DELIVERY}>Entrée de livraison fournisseur</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Commentaires</label>
            <textarea
              value={adjustForm.note}
              onChange={e => setAdjustForm({ ...adjustForm, note: e.target.value })}
              placeholder="Note facultative sur la perte..."
              rows={2}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none resize-none"
            />
          </div>

          {adjustError && <p className="text-xs font-bold text-red-500">{adjustError}</p>}
          {adjustSuccess && <p className="text-xs font-bold text-green-600">Stock ajusté avec succès !</p>}

          <button
            type="submit"
            disabled={isAdjusting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[#FF6D00] hover:bg-[#E66200] transition-colors disabled:opacity-50 shadow-md shadow-orange-500/10"
          >
            {isAdjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
            Enregistrer l'Ajustement
          </button>
        </form>
      </div>

      {/* History of Adjustments */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm">
        <h2 className="text-base font-black text-black mb-6">Mouvements & Historique Logistique</h2>
        {isLoadingAsync ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto h-8 w-8 text-[#FF6D00] animate-spin" />
            <p className="mt-4 text-xs font-bold text-[#868e96]">Chargement de l'historique...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-[#E5E7EB] rounded-2xl">
            <History className="mx-auto h-8 w-8 text-[#adb5bd]" />
            <p className="mt-4 text-sm font-black text-[#171717]">Aucun mouvement enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-[#495057]">
              <thead>
                <tr className="border-b border-[#F0F1F6] text-[10px] font-black uppercase tracking-widest text-[#868e96]">
                  <th className="pb-4">Date</th>
                  <th className="pb-4">Ingrédient</th>
                  <th className="pb-4">Magasin</th>
                  <th className="pb-4">Quantité</th>
                  <th className="pb-4">Motif</th>
                  <th className="pb-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F8F9FA]/50 transition-colors">
                    <td className="py-4 text-[#868e96]">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="py-4 font-black text-black">{m.ingredient.name}</td>
                    <td className="py-4 font-bold text-black">{m.store.name}</td>
                    <td className={`py-4 font-black ${m.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.ingredient.unit}
                    </td>
                    <td className="py-4">{getReasonBadge(m.reason)}</td>
                    <td className="py-4 text-[#868e96] text-xs max-w-xs truncate">{m.note || '-'}</td>
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
