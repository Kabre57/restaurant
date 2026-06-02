'use client'

import React, { useState, useEffect } from 'react'
import { 
  Archive, 
  Plus, 
  AlertTriangle, 
  BarChart2, 
  Search, 
  ArrowLeftRight, 
  SlidersHorizontal, 
  Coins, 
  History, 
  Check, 
  Loader2, 
  DollarSign, 
  FileText,
  TrendingUp,
  Percent,
  Trash2, 
  Edit2,
  X
} from 'lucide-react'
import { AddIngredientModal } from './subcomponents/AddIngredientModal'
import { UpdateInventoryModal } from './subcomponents/UpdateInventoryModal'
import { deleteInventory } from '@/app/actions/inventory'
import { 
  transferStockAction, 
  adjustStockAction, 
  getInventoryValuationReport, 
  getIngredientMovements,
  updateIngredientPrices
} from '@/app/actions/inventory'
import { IngMvtReason } from '@prisma/client'

type InventoryData = {
  id: string
  quantity: number
  minStock: number
  lastUpdated: Date
  ingredient: { id: string; name: string; unit: string; costPrice: number; sellPrice: number }
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
  const [activeTab, setActiveTab] = useState<'levels' | 'transfers' | 'adjustments' | 'valuation'>('levels')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingInventory, setEditingInventory] = useState<InventoryData | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Transfers Tab State
  const [transferForm, setTransferForm] = useState({
    sourceStoreId: stores[0]?.id || '',
    destStoreId: stores[1]?.id || '',
    ingredientId: '',
    quantity: '',
    note: ''
  })
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferSuccess, setTransferSuccess] = useState(false)

  // Adjustments Tab State
  const [adjustForm, setAdjustForm] = useState({
    storeId: stores[0]?.id || '',
    ingredientId: '',
    quantity: '',
    type: 'DELTA' as 'SET' | 'DELTA',
    reason: IngMvtReason.ADJUSTMENT_CORRECTION as IngMvtReason,
    note: ''
  })
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState(false)

  // Pricing Modal State
  const [pricingIngredient, setPricingIngredient] = useState<{
    id: string
    name: string
    costPrice: number
    sellPrice: number
  } | null>(null)
  const [pricingForm, setPricingForm] = useState({ costPrice: '', sellPrice: '' })
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false)

  // Async data
  const [movements, setMovements] = useState<any[]>([])
  const [valuation, setValuation] = useState<any>(null)
  const [isLoadingAsync, setIsLoadingAsync] = useState(false)

  // Filter levels
  const filteredInventories = inventories.filter(item =>
    item.ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.store.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Unique ingredients list for dropdowns
  const uniqueIngredientsMap = new Map()
  inventories.forEach(item => {
    uniqueIngredientsMap.set(item.ingredient.id, item.ingredient)
  })
  const uniqueIngredients = Array.from(uniqueIngredientsMap.values())

  useEffect(() => {
    if (activeTab === 'transfers' || activeTab === 'adjustments') {
      loadMovementsData()
    } else if (activeTab === 'valuation') {
      loadValuationData()
    }
  }, [activeTab])

  const loadMovementsData = async () => {
    setIsLoadingAsync(true)
    const data = await getIngredientMovements()
    setMovements(data)
    setIsLoadingAsync(false)
  }

  const loadValuationData = async () => {
    setIsLoadingAsync(true)
    const data = await getInventoryValuationReport()
    setValuation(data)
    setIsLoadingAsync(false)
  }

  const handleSuccess = () => {
    setIsAddModalOpen(false)
    setEditingInventory(null)
    refreshDataAction()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet ingrédient de l\'inventaire ?')) return
    setIsDeleting(id)
    const res = await deleteInventory(id)
    setIsDeleting(null)
    if (res.success) {
      refreshDataAction()
    } else {
      alert(res.error || 'Erreur lors de la suppression')
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTransferring(true)
    setTransferError('')
    setTransferSuccess(false)

    const res = await transferStockAction({
      sourceStoreId: transferForm.sourceStoreId,
      destStoreId: transferForm.destStoreId,
      ingredientId: transferForm.ingredientId,
      quantity: parseFloat(transferForm.quantity) || 0,
      note: transferForm.note
    }) as { success: boolean; error?: string }

    setIsTransferring(false)
    if (res.success) {
      setTransferSuccess(true)
      setTransferForm(prev => ({ ...prev, quantity: '', note: '' }))
      loadMovementsData()
      refreshDataAction()
      setTimeout(() => setTransferSuccess(false), 3000)
    } else {
      setTransferError(res.error || "Le transfert a échoué")
    }
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdjusting(true)
    setAdjustError('')
    setAdjustSuccess(false)

    const res = await adjustStockAction({
      storeId: adjustForm.storeId,
      ingredientId: adjustForm.ingredientId,
      quantity: parseFloat(adjustForm.quantity) || 0,
      type: adjustForm.type,
      reason: adjustForm.reason,
      note: adjustForm.note
    }) as { success: boolean; error?: string }

    setIsAdjusting(false)
    if (res.success) {
      setAdjustSuccess(true)
      setAdjustForm(prev => ({ ...prev, quantity: '', note: '' }))
      loadMovementsData()
      refreshDataAction()
      setTimeout(() => setAdjustSuccess(false), 3000)
    } else {
      setAdjustError(res.error || "L'ajustement a échoué")
    }
  }

  const handlePricesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pricingIngredient) return
    setIsUpdatingPrices(true)

    const res = await updateIngredientPrices(
      pricingIngredient.id,
      parseFloat(pricingForm.costPrice) || 0,
      parseFloat(pricingForm.sellPrice) || 0
    )

    setIsUpdatingPrices(false)
    if (res.success) {
      setPricingIngredient(null)
      loadValuationData()
      refreshDataAction()
    } else {
      alert(res.error || "Erreur de mise à jour des prix")
    }
  }

  const openPricingModal = (ing: any) => {
    setPricingIngredient(ing)
    setPricingForm({
      costPrice: ing.costPrice?.toString() || '0',
      sellPrice: ing.sellPrice?.toString() || '0'
    })
  }

  const getReasonBadge = (reason: IngMvtReason) => {
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

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">LOGISTIQUE AVANCÉE LOYVERSE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Gestion de l'Inventaire
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Suivi des stocks d'ingrédients, ordres de transfert inter-magasins, ajustements motivés et évaluation financière.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all"
        >
          <Plus className="h-4 w-4" />
          Ajouter Ingrédient
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#E5E7EB] pb-px">
        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
            activeTab === 'levels'
              ? 'border-[#FF6D00] text-[#FF6D00]'
              : 'border-transparent text-[#868e96] hover:text-[#171717]'
          }`}
        >
          <Archive className="h-4 w-4" />
          Niveaux de Stocks
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
            activeTab === 'transfers'
              ? 'border-[#FF6D00] text-[#FF6D00]'
              : 'border-transparent text-[#868e96] hover:text-[#171717]'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Ordres de Transfert
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
            activeTab === 'adjustments'
              ? 'border-[#FF6D00] text-[#FF6D00]'
              : 'border-transparent text-[#868e96] hover:text-[#171717]'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Ajustements de Stock
        </button>
        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
            activeTab === 'valuation'
              ? 'border-[#FF6D00] text-[#FF6D00]'
              : 'border-transparent text-[#868e96] hover:text-[#171717]'
          }`}
        >
          <Coins className="h-4 w-4" />
          Évaluation Financière
        </button>
      </div>

      {/* Tab: Niveaux de Stocks */}
      {activeTab === 'levels' && (
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
      )}

      {/* Tab: Ordres de Transfert */}
      {activeTab === 'transfers' && (
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
      )}

      {/* Tab: Ajustements de Stock */}
      {activeTab === 'adjustments' && (
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
      )}

      {/* Tab: Évaluation des Stocks */}
      {activeTab === 'valuation' && (
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
                              id: inventories.find(inv => inv.id === item.id)?.ingredient.id,
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
      )}

      {/* Pricing Modal */}
      {pricingIngredient && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-scaleIn">
            <header className="flex items-center justify-between border-b border-[#F0F1F6] px-8 py-6">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter text-[#171717]">Tarifs de Stock</h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#adb5bd]">{pricingIngredient.name}</p>
              </div>
              <button onClick={() => setPricingIngredient(null)} className="rounded-full p-2 transition-all hover:bg-[#F8F9FA]">
                <X className="h-5 w-5 text-[#adb5bd]" />
              </button>
            </header>
            <form onSubmit={handlePricesSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Coût d'Achat Unitaire (F CFA)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={pricingForm.costPrice}
                  onChange={e => setPricingForm({ ...pricingForm, costPrice: e.target.value })}
                  placeholder="Ex: 500"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Prix de Vente Estimé (F CFA)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={pricingForm.sellPrice}
                  onChange={e => setPricingForm({ ...pricingForm, sellPrice: e.target.value })}
                  placeholder="Ex: 1200"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 text-sm font-bold focus:border-[#FF6D00] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPrices}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[#FF6D00] hover:bg-[#E66200] transition-colors disabled:opacity-50"
              >
                {isUpdatingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Mettre à jour
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Legacy Inventory Modals */}
      {isAddModalOpen && (
        <AddIngredientModal
          stores={stores}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {editingInventory && (
        <UpdateInventoryModal
          inventory={editingInventory}
          onClose={() => setEditingInventory(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
