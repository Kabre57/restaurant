'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SlidersHorizontal, Loader2, History, RotateCcw } from 'lucide-react'
import { IngMvtReason } from '@prisma/client'
import { 
  getInventoryByStore, 
  getAllIngredients, 
  adjustStockAction,
  getIngredientMovements
} from '@/app/actions/inventory'
import { CrudTable } from '@/components/ui/ParabellumCrudTable'

export default function StockAdjustmentsPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [ingredients, setIngredients] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [adjustForm, setAdjustForm] = useState({
    ingredientId: '',
    quantity: '',
    type: 'DELTA' as 'SET' | 'DELTA',
    reason: 'ADJUSTMENT_CORRECTION' as IngMvtReason,
    note: ''
  })

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const [ings, mvts] = await Promise.all([
        getInventoryByStore(storeId),
        getIngredientMovements(storeId)
      ])
      setIngredients(ings)
      // Filter movements to keep only adjustments
      const adjustmentMovements = mvts.filter((m: any) => 
        m.reason === 'ADJUSTMENT_CORRECTION' ||
        m.reason === 'ADJUSTMENT_LOSS' ||
        m.reason === 'ADJUSTMENT_THEFT' ||
        m.reason === 'ADJUSTMENT_WASTE'
      )
      setMovements(adjustmentMovements)
    } catch (err) {
      console.error("Failed to load adjustments data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      void loadData()
    }
  }, [storeId])

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId || !adjustForm.ingredientId || !adjustForm.quantity) return

    try {
      setIsAdjusting(true)
      setError('')
      setSuccess(false)

      const qty = parseFloat(adjustForm.quantity)
      if (isNaN(qty)) {
        setError("Veuillez saisir une quantité valide.")
        return
      }

      const res = await adjustStockAction({
        storeId,
        ingredientId: adjustForm.ingredientId,
        quantity: qty,
        type: adjustForm.type,
        reason: adjustForm.reason,
        note: adjustForm.note
      })

      if (res.success) {
        setSuccess(true)
        setAdjustForm({
          ingredientId: '',
          quantity: '',
          type: 'DELTA',
          reason: 'ADJUSTMENT_CORRECTION',
          note: ''
        })
        await loadData()
      } else {
        const errMsg = 'error' in res ? res.error : "Une erreur est survenue."
        setError(errMsg)
      }
    } catch (err) {
      console.error(err)
      setError("Erreur technique lors de l'ajustement.")
    } finally {
      setIsAdjusting(false)
    }
  }

  const getReasonBadge = (reason: IngMvtReason) => {
    switch (reason) {
      case 'ADJUSTMENT_CORRECTION':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-50 text-blue-600 border border-blue-100">Correction</span>
      case 'ADJUSTMENT_LOSS':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-50 text-amber-600 border border-amber-100">Perte</span>
      case 'ADJUSTMENT_THEFT':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-red-50 text-red-600 border border-red-100">Vol</span>
      case 'ADJUSTMENT_WASTE':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-rose-50 text-rose-600 border border-rose-100">Casse</span>
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-gray-50 text-gray-500 border border-gray-100">{reason}</span>
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Ajustements des stocks</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            Gérez manuellement vos écarts, pertes, casses et corrections d'inventaire
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Card */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-[#dee2e6] p-6 shadow-sm h-fit">
            <h2 className="text-base font-black text-[#212529] uppercase tracking-wider mb-6 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#FF6D00]" />
              Faire un Ajustement
            </h2>

            <form onSubmit={handleAdjustSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd] ml-1">Ingrédient à Ajuster</label>
                <select
                  required
                  value={adjustForm.ingredientId}
                  onChange={e => setAdjustForm({ ...adjustForm, ingredientId: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/20"
                >
                  <option value="">Sélectionner un ingrédient</option>
                  {ingredients.map(item => (
                    <option key={item.ingredient.id} value={item.ingredient.id}>
                      {item.ingredient.name} (En stock: {item.quantity} {item.ingredient.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd] ml-1">Mode d'Ajustement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'DELTA' })}
                    className={`py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
                      adjustForm.type === 'DELTA'
                        ? 'bg-[#171717] text-white shadow-md'
                        : 'bg-[#F8F9FA] text-[#868e96] border border-[#dee2e6] hover:bg-gray-50'
                    }`}
                  >
                    Ajouter/Soustraire
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'SET' })}
                    className={`py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
                      adjustForm.type === 'SET'
                        ? 'bg-[#171717] text-white shadow-md'
                        : 'bg-[#F8F9FA] text-[#868e96] border border-[#dee2e6] hover:bg-gray-50'
                    }`}
                  >
                    Fixer Quantité
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd] ml-1">
                  {adjustForm.type === 'SET' ? 'Nouvelle quantité absolue' : 'Quantité de différence (ex: -5 ou 10)'}
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  placeholder={adjustForm.type === 'SET' ? "Ex: 50" : "Ex: -2.5 ou 15"}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd] ml-1">Motif de l'Ajustement</label>
                <select
                  required
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value as IngMvtReason })}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/20"
                >
                  <option value="ADJUSTMENT_CORRECTION">Correction d'inventaire</option>
                  <option value="ADJUSTMENT_LOSS">Perte de stock</option>
                  <option value="ADJUSTMENT_THEFT">Vol constaté</option>
                  <option value="ADJUSTMENT_WASTE">Casse / Abîmé</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd] ml-1">Notes / Raison</label>
                <textarea
                  value={adjustForm.note}
                  onChange={e => setAdjustForm({ ...adjustForm, note: e.target.value })}
                  placeholder="Note facultative décrivant l'ajustement..."
                  rows={2}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/20 resize-none"
                />
              </div>

              {error && <p className="text-xs font-bold text-red-500">{error}</p>}
              {success && <p className="text-xs font-bold text-green-600">Stock ajusté avec succès !</p>}

              <button
                type="submit"
                disabled={isAdjusting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-[#FF6D00] hover:bg-[#E66200] transition-colors disabled:opacity-50 shadow-md shadow-orange-500/10"
              >
                {isAdjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
                Enregistrer
              </button>
            </form>
          </div>

          {/* History Card */}
          <div className="lg:col-span-2 space-y-6">
            <CrudTable
              title="Historique des Ajustements Récents"
              rows={movements}
              emptyLabel="Aucun ajustement manuel enregistré"
              columns={[
                { key: 'createdAt', label: 'Date/Heure' },
                { key: 'ingredient', label: 'Ingrédient' },
                { key: 'quantity', label: 'Variation' },
                { key: 'reason', label: 'Motif' },
                { key: 'note', label: 'Description' }
              ]}
              renderRow={(m) => (
                <tr key={m.id} className="transition hover:bg-[#fafbfc]">
                  <td className="px-6 py-4 text-xs text-[#adb5bd] font-medium">
                    {new Date(m.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[#212529]">
                    {m.ingredient.name}
                  </td>
                  <td className={`px-6 py-4 text-xs font-black ${m.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.ingredient.unit}
                  </td>
                  <td className="px-6 py-4">
                    {getReasonBadge(m.reason)}
                  </td>
                  <td className="px-6 py-4 text-xs text-[#868e96] max-w-xs truncate">
                    {m.note || '-'}
                  </td>
                </tr>
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}
