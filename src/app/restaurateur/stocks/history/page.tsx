'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { History, Search, Loader2, RefreshCcw, Filter } from 'lucide-react'
import { getIngredientMovements } from '@/app/actions/inventory'
import { IngMvtReason } from '@prisma/client'
import { CrudTable } from '@/components/ui/ParabellumCrudTable'

export default function StockHistoryPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [reasonFilter, setReasonFilter] = useState<string>('ALL')

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const res = await getIngredientMovements(storeId)
      setMovements(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      void loadData()
    }
  }, [storeId])

  const getReasonBadge = (reason: IngMvtReason) => {
    switch (reason) {
      case 'INITIAL_STOCK':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Stock Initial</span>
      case 'DELIVERY':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Livraison</span>
      case 'TRANSFER_IN':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-teal-50 text-teal-600 border border-teal-100">Transfert Reçu</span>
      case 'TRANSFER_OUT':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-orange-50 text-orange-600 border border-orange-100">Transfert Expédié</span>
      case 'ADJUSTMENT_CORRECTION':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-blue-50 text-blue-600 border border-blue-100">Correction</span>
      case 'ADJUSTMENT_LOSS':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-amber-50 text-amber-600 border border-amber-100">Perte</span>
      case 'ADJUSTMENT_THEFT':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-red-50 text-red-600 border border-red-100">Vol</span>
      case 'ADJUSTMENT_WASTE':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-rose-50 text-rose-600 border border-rose-100">Casse</span>
      default:
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-gray-50 text-gray-500 border border-gray-100">{reason}</span>
    }
  }

  const filteredMovements = movements.filter(m => {
    const matchesSearch = m.ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.note && m.note.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesReason = reasonFilter === 'ALL' || m.reason === reasonFilter
    
    return matchesSearch && matchesReason
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Historique des stocks</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            Visualisez tous les flux, livraisons, consommations, transferts et ajustements de stock
          </p>
        </div>
        <button 
          onClick={loadData}
          className="rounded-2xl border border-[#dee2e6] bg-white p-3 text-[#adb5bd] transition-all hover:bg-[#f8f9fa] hover:text-[#212529] self-start"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#adb5bd]" />
          <input
            type="text"
            placeholder="Rechercher un ingrédient ou une note..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#dee2e6] bg-white text-sm font-bold outline-none transition focus:border-[#FF6D00]"
          />
        </div>

        {/* Reason Selector */}
        <div className="relative flex items-center">
          <Filter className="absolute left-4 w-4 h-4 text-[#adb5bd]" />
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#dee2e6] bg-white text-xs font-black uppercase tracking-wider outline-none transition focus:border-[#FF6D00] appearance-none cursor-pointer"
          >
            <option value="ALL">Tous les motifs</option>
            <option value="INITIAL_STOCK">Stock Initial</option>
            <option value="DELIVERY">Livraisons Fournisseurs</option>
            <option value="TRANSFER_IN">Transferts Reçus</option>
            <option value="TRANSFER_OUT">Transferts Expédiés</option>
            <option value="ADJUSTMENT_CORRECTION">Corrections</option>
            <option value="ADJUSTMENT_LOSS">Pertes</option>
            <option value="ADJUSTMENT_THEFT">Vols</option>
            <option value="ADJUSTMENT_WASTE">Cassures</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#adb5bd]">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" />
        </div>
      ) : (
        <div className="space-y-6">
          <CrudTable
            title="Mouvements Logistiques Enregistrés"
            rows={filteredMovements}
            emptyLabel="Aucun mouvement trouvé pour ces critères"
            columns={[
              { key: 'createdAt', label: 'Date & Heure' },
              { key: 'ingredientName', label: 'Ingrédient / Article' },
              { key: 'quantity', label: 'Quantité / Impact' },
              { key: 'reason', label: 'Motif' },
              { key: 'note', label: 'Notes' }
            ]}
            renderRow={(m) => (
              <tr key={m.id} className="transition hover:bg-[#fafbfc]">
                <td className="px-6 py-4 text-xs font-semibold text-[#adb5bd]">
                  {new Date(m.createdAt).toLocaleString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-xs font-black text-black">
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
      )}
    </div>
  )
}
