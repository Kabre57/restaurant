'use client'

import React from 'react'
import { ArrowLeftRight, Loader2, History } from 'lucide-react'
import { IngMvtReason } from '@prisma/client'

interface Props {
  stores: { id: string; name: string }[]
  transferForm: {
    sourceStoreId: string
    destStoreId: string
    ingredientId: string
    quantity: string
    note: string
  }
  setTransferForm: React.Dispatch<React.SetStateAction<{
    sourceStoreId: string
    destStoreId: string
    ingredientId: string
    quantity: string
    note: string
  }>>
  uniqueIngredients: { id: string; name: string; unit: string }[]
  isTransferring: boolean
  transferError: string
  transferSuccess: boolean
  handleTransferSubmit: (e: React.FormEvent) => void
  isLoadingAsync: boolean
  movements: any[]
}

export function getReasonBadge(reason: IngMvtReason) {
  switch (reason) {
    case IngMvtReason.INITIAL_STOCK:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">Initial</span>
    case IngMvtReason.DELIVERY:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">Entrée Livr.</span>
    case IngMvtReason.TRANSFER_IN:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">Transfert In</span>
    case IngMvtReason.TRANSFER_OUT:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">Transfert Out</span>
    case IngMvtReason.ADJUSTMENT_LOSS:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">Perte</span>
    case IngMvtReason.ADJUSTMENT_THEFT:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">Vol</span>
    case IngMvtReason.ADJUSTMENT_WASTE:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700">Casse</span>
    case IngMvtReason.ADJUSTMENT_CORRECTION:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">Correction</span>
    default:
      return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700">{reason}</span>
  }
}

export function TransfersTab({
  stores,
  transferForm,
  setTransferForm,
  uniqueIngredients,
  isTransferring,
  transferError,
  transferSuccess,
  handleTransferSubmit,
  isLoadingAsync,
  movements
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Transfer Form Card */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm h-fit">
        <h2 className="text-base font-black text-black mb-6">Créer un Ordre de Transfert</h2>
        <form onSubmit={handleTransferSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Magasin Source</label>
            <select
              required
              value={transferForm.sourceStoreId}
              onChange={e => setTransferForm({ ...transferForm, sourceStoreId: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Magasin Destination</label>
            <select
              required
              value={transferForm.destStoreId}
              onChange={e => setTransferForm({ ...transferForm, destStoreId: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Ingrédient à transférer</label>
            <select
              required
              value={transferForm.ingredientId}
              onChange={e => setTransferForm({ ...transferForm, ingredientId: e.target.value })}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            >
              <option value="">-- Choisir un ingrédient --</option>
              {uniqueIngredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Quantité</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={transferForm.quantity}
              onChange={e => setTransferForm({ ...transferForm, quantity: e.target.value })}
              placeholder="Ex: 5"
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Note / Commentaire</label>
            <textarea
              value={transferForm.note}
              onChange={e => setTransferForm({ ...transferForm, note: e.target.value })}
              placeholder="Ex: Réapprovisionnement urgent week-end..."
              rows={2}
              className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none resize-none"
            />
          </div>

          {transferError && <p className="text-xs font-bold text-red-500">{transferError}</p>}
          {transferSuccess && <p className="text-xs font-bold text-green-600">Stock transféré avec succès !</p>}

          <button
            type="submit"
            disabled={isTransferring}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[#FF6D00] hover:bg-[#E66200] transition-colors disabled:opacity-50 shadow-md shadow-orange-500/10"
          >
            {isTransferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
            Exécuter le Transfert
          </button>
        </form>
      </div>

      {/* Transfer History Card */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm">
        <h2 className="text-base font-black text-black mb-6">Historique Récent des Mouvements</h2>
        {isLoadingAsync ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto h-8 w-8 text-[#FF6D00] animate-spin" />
            <p className="mt-4 text-xs font-bold text-[#868e96]">Chargement de l'historique...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-[#E5E7EB] rounded-2xl">
            <History className="mx-auto h-8 w-8 text-[#adb5bd]" />
            <p className="mt-4 text-sm font-black text-[#171717]">Aucun mouvement de stock</p>
            <p className="text-xs font-bold text-[#868e96]">Les ordres de transfert et ajustements s'afficheront ici.</p>
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
