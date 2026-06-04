'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Building, Plus, Search, Mail, Phone, MapPin, Loader2, X } from 'lucide-react'
import { getSuppliers, createSupplier } from '@/app/actions/purchaseOrders'
import { CrudTable, CrudPrimaryButton } from '@/components/ui/ParabellumCrudTable'

export default function SuppliersPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactName: '',
    taxId: '',
    notes: ''
  })

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const res = await getSuppliers()
      setSuppliers(res)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !storeId) return

    try {
      setSubmitting(true)
      setError('')
      await createSupplier(form)
      setShowModal(false)
      setForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactName: '',
        taxId: '',
        notes: ''
      })
      await loadData()
    } catch (err) {
      console.error(err)
      setError("Le nom de ce fournisseur est déjà utilisé ou invalide.")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contactName && s.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Fournisseurs</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            Gérez vos fournisseurs partenaires pour le réapprovisionnement logistique
          </p>
        </div>
        <CrudPrimaryButton onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Fournisseur
        </CrudPrimaryButton>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#adb5bd]" />
        <input
          type="text"
          placeholder="Rechercher un fournisseur par nom, contact ou email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[#dee2e6] bg-white text-sm font-bold outline-none transition focus:border-[#FF6D00]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" />
        </div>
      ) : (
        <div className="space-y-6">
          <CrudTable
            title="Liste des Fournisseurs Actifs"
            rows={filteredSuppliers}
            emptyLabel="Aucun fournisseur trouvé"
            columns={[
              { key: 'name', label: 'Fournisseur' },
              { key: 'contactName', label: 'Contact Principal' },
              { key: 'phone', label: 'Téléphone' },
              { key: 'email', label: 'E-mail' },
              { key: 'address', label: 'Adresse' },
              { key: 'taxId', label: 'RCCM / NIF' }
            ]}
            renderRow={(s) => (
              <tr key={s.id} className="transition hover:bg-[#fafbfc]">
                <td className="px-6 py-4 text-xs font-black text-black">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#FF6D00]" />
                    {s.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-[#495057]">
                  {s.contactName || '-'}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-[#72788f]">
                  {s.phone || '-'}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-[#72788f]">
                  {s.email || '-'}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-[#72788f] max-w-xs truncate">
                  {s.address || '-'}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-[#212529]">
                  {s.taxId || '-'}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-10 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouveau Fournisseur</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Créez une fiche de fournisseur de stock</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom du Fournisseur *</label>
                <input 
                  required
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                  placeholder="EX: Brasseries de Côte d'Ivoire (SOLIBRA)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom du Contact</label>
                  <input 
                    type="text" 
                    value={form.contactName} 
                    onChange={e => setForm({...form, contactName: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
                    placeholder="EX: M. Traoré"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Numéro RCCM / NIF</label>
                  <input 
                    type="text" 
                    value={form.taxId} 
                    onChange={e => setForm({...form, taxId: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
                    placeholder="EX: CI-ABJ-2023-B-12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Téléphone</label>
                  <input 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
                    placeholder="EX: +225 07 00 00 00 00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">E-mail</label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
                    placeholder="EX: commercial@solibra.ci"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Adresse Géographique</label>
                <input 
                  type="text" 
                  value={form.address} 
                  onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
                  placeholder="EX: Abidjan, Zone 3, Rue des Brasseurs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Notes / Conditions</label>
                <textarea 
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none resize-none" 
                  rows={2}
                  placeholder="Conditions de règlement, délais de livraisons..."
                />
              </div>

              {error && <p className="text-xs font-bold text-red-500">{error}</p>}

              <button 
                disabled={submitting} 
                type="submit" 
                className="w-full bg-[#171717] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:bg-[#adb5bd] shadow-lg shadow-black/10"
              >
                {submitting ? "Création en cours..." : "Créer le Fournisseur"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
