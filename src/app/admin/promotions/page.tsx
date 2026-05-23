'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Power, Loader2, Store, Calendar, Ticket } from 'lucide-react'
import { getPromotions, createPromotion, deletePromotion, togglePromotionStatus } from '@/app/actions/promotions'
import { getStores } from '@/app/actions/stores'
import { DiscountType } from '@prisma/client'
import { AlertModal } from '@/components/pos/subcomponents/AlertModal'

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ title: string, message: string, type?: 'error' | 'success' } | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE' as DiscountType,
    value: '',
    storeId: '',
    usageLimit: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [pData, sData] = await Promise.all([
      getPromotions(),
      getStores()
    ])
    setPromotions(pData)
    setStores(sData)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.code || !formData.value || !formData.storeId) {
      setAlert({ title: "Champs requis", message: "Veuillez remplir tous les champs obligatoires." })
      return
    }

    setIsSubmitting(true)
    const res = await createPromotion({
      code: formData.code,
      discountType: formData.discountType,
      value: parseFloat(formData.value),
      storeId: formData.storeId,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined
    })

    if (res.success) {
      setAlert({ title: "Succès", message: "Promotion créée avec succès", type: 'success' })
      setShowModal(false)
      setFormData({ code: '', discountType: 'PERCENTAGE', value: '', storeId: '', usageLimit: '', startDate: '', endDate: '' })
      loadData()
    } else {
      setAlert({ title: "Erreur", message: res.error || "Échec de la création" })
    }
    setIsSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette promotion ?")) return
    const res = await deletePromotion(id)
    if (res.success) loadData()
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await togglePromotionStatus(id, !current)
    if (res.success) loadData()
  }

  function getPromoStatus(promo: any) {
    if (!promo.isActive) return { label: 'Inactif', color: 'bg-[#f1f3f5] text-[#adb5bd]' }
    const now = new Date()
    if (promo.startDate && new Date(promo.startDate) > now) {
      return { label: 'À venir', color: 'bg-[#fff9db] text-[#f08c00]' }
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      return { label: 'Expiré', color: 'bg-[#fff5f5] text-[#e03131]' }
    }
    return { label: 'Actif', color: 'bg-[#ebfbee] text-[#2f9e44]' }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Gestion des Promotions</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Créez et gérez les codes de réduction globaux et périodiques</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#212529] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black sm:w-auto sm:px-8"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Promo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promo) => {
            const status = getPromoStatus(promo)
            return (
              <div key={promo.id} className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl ${promo.isActive ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#f1f3f5] text-[#adb5bd]'}`}>
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 transition-all sm:opacity-0 sm:group-hover:opacity-100">
                    <button onClick={() => handleToggle(promo.id, promo.isActive)} className="p-2 hover:bg-[#f8f9fa] rounded-lg text-[#495057]" title="Activer/Désactiver">
                      <Power className={`w-4 h-4 ${promo.isActive ? 'text-[#2f9e44]' : 'text-[#adb5bd]'}`} />
                    </button>
                    <button onClick={() => handleDelete(promo.id)} className="p-2 hover:bg-[#fff5f5] rounded-lg text-[#e03131]" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-[#212529] uppercase tracking-tight mb-1">{promo.code}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-[#212529] text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                    -{promo.value}{promo.discountType === 'PERCENTAGE' ? '%' : ' F'}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="pt-6 border-t border-[#f1f3f5] space-y-3">
                  <div className="flex items-center gap-3 text-[#adb5bd]">
                    <Store className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{promo.store?.name || 'Tous les stores'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#adb5bd]">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Utilisé: {promo.usedCount} {promo.usageLimit ? `/ ${promo.usageLimit}` : ''}</span>
                  </div>
                  {promo.startDate && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Calendar className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Début: {new Date(promo.startDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  {promo.endDate && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Calendar className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#e03131]">Fin: {new Date(promo.endDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de création */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1a1d24]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight mb-8">Nouvelle Promotion</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Code Promo</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
                  placeholder="EX: NOEL2024"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Type</label>
                  <select
                    value={formData.discountType}
                    onChange={e => setFormData({...formData, discountType: e.target.value as DiscountType})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                  >
                    <option value="PERCENTAGE">Pourcentage (%)</option>
                    <option value="FIXED_AMOUNT">Montant Fixe (F)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Valeur</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Établissement</label>
                <select
                  required
                  value={formData.storeId}
                  onChange={e => setFormData({...formData, storeId: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                >
                  <option value="">Sélectionner un restaurant</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Date Début (Optionnel)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Date Fin (Optionnel)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Limite d'utilisation (Optionnel)</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={e => setFormData({...formData, usageLimit: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none"
                  placeholder="Illimité"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:gap-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-[#f8f9fa] text-[#495057] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#f1f3f5] transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[1.5] py-4 bg-[#212529] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Créer la promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alert && (
        <AlertModal 
          type={alert.type || 'error'}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  )
}
