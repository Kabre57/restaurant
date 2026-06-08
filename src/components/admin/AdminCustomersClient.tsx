'use client'

import React, { useState } from 'react'
import { Users, Award, Zap, Search, Plus, X, Calendar, Edit3, Clipboard, ShoppingBag, Loader2, Check } from 'lucide-react'
import { AddCustomerModal } from './subcomponents/AddCustomerModal'
import { updateCustomer } from '@/app/actions/clients/clients'

type CustomerData = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: Date
  loyalty: { points: number } | null
  orders: { id: string; total: number; createdAt: Date; status: string }[]
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
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  
  // States for updating notes
  const [editNotes, setEditNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const filteredCustomers = customers.filter(c =>
    c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSuccess = () => {
    setIsModalOpen(false)
    refreshDataAction()
  }

  const handleRowClick = (c: CustomerData) => {
    setSelectedCustomer(c)
    setEditNotes(c.notes || '')
    setSaveSuccess(false)
  }

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return
    setIsSavingNotes(true)
    
    const res = await updateCustomer(selectedCustomer.id, {
      firstName: selectedCustomer.firstName,
      lastName: selectedCustomer.lastName,
      email: selectedCustomer.email || undefined,
      phone: selectedCustomer.phone || undefined,
      notes: editNotes
    })

    setIsSavingNotes(false)
    if (res.success) {
      setSaveSuccess(true)
      // Update local state copy
      setSelectedCustomer({
        ...selectedCustomer,
        notes: editNotes
      })
      refreshDataAction()
      setTimeout(() => setSaveSuccess(false), 2000)
    }
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
              placeholder="Rechercher un client ou des notes..."
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
                  <th className="pb-4">Notes / Préf.</th>
                  <th className="pb-4">Commandes</th>
                  <th className="pb-4">Total Dépenses</th>
                  <th className="pb-4">Points Fidélité</th>
                  <th className="pb-4">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F6]">
                {filteredCustomers.map((c) => {
                  const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0)
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => handleRowClick(c)}
                      className="hover:bg-[#F8F9FA]/80 transition-colors cursor-pointer"
                    >
                      <td className="py-4 font-black text-black">{c.firstName} {c.lastName}</td>
                      <td className="py-4 text-[#868e96] font-bold">{c.email || 'Non renseigné'}</td>
                      <td className="py-4 text-[#868e96] font-bold">{c.phone || 'Non renseigné'}</td>
                      <td className="py-4 text-[#868e96] font-bold max-w-[150px] truncate">
                        {c.notes || '-'}
                      </td>
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

      {/* Slide-out Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slideLeft overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-[#F0F1F6] px-8 py-6 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-[#171717]">
                  Détail Client
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#FF6D00]">
                  Fiche & Historique d'Achats
                </p>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="rounded-full p-2 transition-all hover:bg-[#F8F9FA]"
              >
                <X className="h-6 w-6 text-[#adb5bd]" />
              </button>
            </header>

            {/* Content Body */}
            <div className="p-8 space-y-8 flex-1">
              {/* Profile Overview Card */}
              <div className="bg-[#F8F9FA] rounded-3xl p-6 border border-[#E5E7EB] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-black">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </h3>
                    <p className="text-xs text-[#868e96] font-bold">Inscrit le {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded-2xl bg-amber-500/10 px-4 py-2 font-black text-amber-600 text-sm">
                    {selectedCustomer.loyalty?.points || 0} Points
                  </span>
                </div>

                <div className="border-t border-[#E5E7EB] pt-4 grid grid-cols-2 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Téléphone</span>
                    <span className="text-[#495057]">{selectedCustomer.phone || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Email</span>
                    <span className="text-[#495057]">{selectedCustomer.email || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>

              {/* Editable Notes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                    <Clipboard className="h-4 w-4 text-[#FF6D00]" />
                    Notes & Préférences Client
                  </h4>
                  {saveSuccess && (
                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Sauvegardé !
                    </span>
                  )}
                </div>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Inscrivez les préférences, allergies, réductions spécifiques..."
                  className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-4 text-sm font-bold text-black outline-none placeholder-[#adb5bd] focus:border-[#FF6D00] min-h-[120px] resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || editNotes === (selectedCustomer.notes || '')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-[#1a1a1a] disabled:opacity-30"
                >
                  {isSavingNotes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                  Mettre à jour les notes
                </button>
              </div>

              {/* Purchase History Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-[#FF6D00]" />
                  Historique d'Achats ({selectedCustomer.orders.length})
                </h4>
                
                {selectedCustomer.orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E5E7EB] py-8 text-center text-xs font-bold text-[#adb5bd]">
                    Aucune commande passée par ce client pour le moment.
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#F0F1F6]">
                    {selectedCustomer.orders.map((o) => {
                      const dateObj = new Date(o.createdAt)
                      return (
                        <div key={o.id} className="flex gap-4 relative pl-8">
                          <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-4 border-[#FF6D00] flex items-center justify-center" />
                          <div className="flex-1 bg-[#F8F9FA] rounded-2xl p-4 border border-[#E5E7EB] flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black text-black">COMMANDE #{o.id.substring(0, 8).toUpperCase()}</p>
                              <span className="text-[9px] font-bold text-[#adb5bd]">
                                {dateObj.toLocaleDateString()} à {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-[#FF6D00]">{o.total.toLocaleString()} FCFA</p>
                              <span className={`text-[8px] font-black uppercase tracking-widest rounded-md px-1.5 py-0.5 ${
                                o.status === 'SERVIE' || o.status === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                                o.status === 'EN_CUISINE' || o.status === 'PRET' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {o.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

