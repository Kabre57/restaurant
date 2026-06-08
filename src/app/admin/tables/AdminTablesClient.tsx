'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Trash2, LayoutGrid, CheckCircle, ShieldAlert, X, Users, ExternalLink, Copy } from 'lucide-react'
import { createTable, deleteTable } from '@/app/actions/store/tables'

interface TableItem {
  id: string
  number: number
  capacity: number
  status: string
  shape: string
  storeId: string
}

interface StoreGroup {
  storeId: string
  storeName: string
  items: TableItem[]
}

interface Props {
  groups: StoreGroup[]
  totalCount: number
  occupiedCount: number
  storeOptions: { id: string; name: string }[]
  activeStoreId?: string
}

export default function AdminTablesClient({ groups, totalCount, occupiedCount, storeOptions, activeStoreId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [selectedStore, setSelectedStore] = useState(activeStoreId || storeOptions[0]?.id || '')
  const [tableNumber, setTableNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    const num = parseInt(tableNumber)
    const cap = parseInt(capacity)
    if (!selectedStore || isNaN(num) || num < 1 || isNaN(cap) || cap < 1) {
      setError('Numéro de table et capacité requis (valeurs positives).')
      return
    }
    setError('')
    startTransition(async () => {
      const result = await createTable({ storeId: selectedStore, number: num, capacity: cap })
      if (result.success) {
        setShowForm(false)
        setTableNumber('')
        setCapacity('4')
      } else {
        setError(result.error || 'Erreur lors de la création.')
      }
    })
  }

  const handleDelete = (tableId: string) => {
    if (!confirm('Supprimer cette table ?')) return
    startTransition(async () => {
      await deleteTable(tableId)
    })
  }

  const getMenuUrl = (storeId: string, tableNumber: number) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${storeId}/${tableNumber}`

  const copyUrl = (storeId: string, tableNumber: number) => {
    const url = getMenuUrl(storeId, tableNumber)
    navigator.clipboard.writeText(url)
    setCopied(`${storeId}-${tableNumber}`)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">INFRASTRUCTURE PHYSIQUE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Gestion des Tables & QR Codes
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Créez, modifiez et supprimez les tables. Chaque table génère un lien QR Code lisible pour le self-service client.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all"
        >
          <Plus className="h-4 w-4" />
          Ajouter une table
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Tables Totales</span>
            <div className="rounded-xl bg-[#FF6D00]/10 p-2.5 text-[#FF6D00]"><LayoutGrid className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{totalCount}</span>
            <span className="text-xs font-bold text-[#868e96]">Disposées en salle</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Tables Occupées</span>
            <div className="rounded-xl bg-orange-500/10 p-2.5 text-[#FF6D00]"><ShieldAlert className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-[#FF6D00]">{occupiedCount}</span>
            <span className="text-xs font-black text-[#FF6D00] uppercase tracking-widest">En service</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Disponibles</span>
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-500"><CheckCircle className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-black">{totalCount - occupiedCount}</span>
            <span className="text-xs font-bold text-green-600">Libres</span>
          </div>
        </div>
      </div>

      {/* Add table modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#171717]">Nouvelle Table</h2>
              <button onClick={() => { setShowForm(false); setError('') }} className="text-[#adb5bd] hover:text-[#495057] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {storeOptions.length > 1 && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">Restaurant</label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 px-4 text-xs font-bold text-[#212529] outline-none focus:border-[#FF6D00]"
                  >
                    {storeOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">Numéro de Table</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex : 5"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 px-4 text-xs font-bold text-[#212529] outline-none focus:border-[#FF6D00]"
                />
                {selectedStore && tableNumber && (
                  <p className="mt-2 text-[9px] font-bold text-[#868e96]">
                    Lien QR généré : <span className="text-[#FF6D00] font-black">/menu/{selectedStore}/{tableNumber}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">Capacité (personnes)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex : 4"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 px-4 text-xs font-bold text-[#212529] outline-none focus:border-[#FF6D00]"
                />
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[10px] font-black text-red-600">{error}</p>
              )}
            </div>
            <div className="border-t border-[#E5E7EB] flex gap-3 px-6 py-4">
              <button
                onClick={() => { setShowForm(false); setError('') }}
                className="flex-1 rounded-xl border border-[#E5E7EB] bg-white py-3 text-[9px] font-black uppercase tracking-widest text-[#868e96] hover:bg-[#F8F9FA] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="flex-1 rounded-xl bg-[#FF6D00] py-3 text-[9px] font-black uppercase tracking-widest text-white hover:bg-[#E66200] transition-all disabled:opacity-60"
              >
                {isPending ? 'Création...' : 'Créer la table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tables list */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-16 text-center">
          <LayoutGrid className="mx-auto h-12 w-12 text-[#adb5bd]" />
          <p className="mt-4 text-sm font-black text-black">Aucune table configurée</p>
          <p className="text-xs font-bold text-[#868e96]">Ajoutez des tables à vos succursales pour générer les menus QR Code.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.storeId} className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
              <h2 className="text-base font-black text-black mb-6">{group.storeName}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {group.items.map((table) => {
                  const menuUrl = `/menu/${group.storeId}/${table.number}`
                  const copyKey = `${group.storeId}-${table.number}`
                  return (
                    <div
                      key={table.id}
                      className="group relative flex flex-col gap-4 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-5 hover:border-[#FF6D00] hover:bg-white transition-all shadow-sm"
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-[#171717]">Table {table.number}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Users className="h-3 w-3 text-[#adb5bd]" />
                            <span className="text-[9px] font-bold text-[#868e96]">{table.capacity} pers.</span>
                          </div>
                        </div>
                        <span className={`flex h-2.5 w-2.5 rounded-full ${table.status === 'OCCUPIED' ? 'bg-[#FF6D00]' : 'bg-green-500'}`} />
                      </div>

                      {/* QR link */}
                      <div className="rounded-xl bg-white border border-[#E5E7EB] px-3 py-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-[#adb5bd] mb-1">Lien QR Code</p>
                        <p className="text-[9px] font-black text-[#FF6D00] truncate">{menuUrl}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyUrl(group.storeId, table.number)}
                          title="Copier le lien"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white py-2 text-[8px] font-black uppercase tracking-widest text-[#495057] hover:border-[#FF6D00] hover:text-[#FF6D00] transition-all"
                        >
                          <Copy className="h-3 w-3" />
                          {copied === copyKey ? 'Copié !' : 'Copier'}
                        </button>
                        <a
                          href={menuUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ouvrir le menu"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#adb5bd] hover:border-[#FF6D00] hover:text-[#FF6D00] transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleDelete(table.id)}
                          title="Supprimer"
                          disabled={isPending}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#adb5bd] hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
