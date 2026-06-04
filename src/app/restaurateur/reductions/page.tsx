'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Power, Loader2, Calendar, Ticket, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getPromotions, createPromotion, deletePromotion, togglePromotionStatus } from '@/app/actions/promotions'
import { DiscountType } from '@prisma/client'
import { AlertModal } from '@/components/pos/subcomponents/AlertModal'

export default function ReductionsPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ title: string, message: string, type?: 'error' | 'success' } | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE' as DiscountType,
    value: '',
    usageLimit: '',
    startDate: '',
    endDate: ''
  })

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const pData = await getPromotions()
      // getPromotions automatically filters by the current user's storeId if not ADMIN
      setPromotions(pData)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId) return

    if (!formData.code || !formData.value) {
      setAlert({ title: "Champs requis", message: "Veuillez remplir tous les champs obligatoires." })
      return
    }

    try {
      setIsSubmitting(true)
      const res = await createPromotion({
        code: formData.code,
        discountType: formData.discountType,
        value: parseFloat(formData.value),
        storeId: storeId,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      })

      if (res.success) {
        setAlert({ title: "Succès", message: "Réduction créée avec succès", type: 'success' })
        setShowModal(false)
        setFormData({ code: '', discountType: 'PERCENTAGE', value: '', usageLimit: '', startDate: '', endDate: '' })
        await loadData()
      } else {
        setAlert({ title: "Erreur", message: res.error || "Échec de la création" })
      }
    } catch (err) {
      console.error(err)
      setAlert({ title: "Erreur", message: "Une erreur technique s'est produite." })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette réduction ?")) return
    try {
      const res = await deletePromotion(id)
      if (res.success) {
        await loadData()
      } else {
        setAlert({ title: "Erreur", message: res.error || "Échec de la suppression" })
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      const res = await togglePromotionStatus(id, !current)
      if (res.success) {
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
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
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Réductions & Promotions</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Créez et gérez les codes de réduction applicables sur le point de vente</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6D00] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-[#E66200] sm:w-auto sm:px-8"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Réduction
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
                  <div className="flex gap-2">
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
                  <span className="px-3 py-1 bg-[#171717] text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                    -{promo.value}{promo.discountType === 'PERCENTAGE' ? '%' : ' F'}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="pt-6 border-t border-[#f1f3f5] space-y-3">
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

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <div className="relative">
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-0 right-0 p-2 text-[#adb5bd] hover:text-[#212529]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight mb-8">Nouvelle Réduction</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Code Promo / Réduction</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                  placeholder="EX: REMISE10, VIP2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Type</label>
                  <select
                    value={formData.discountType}
                    onChange={e => setFormData({...formData, discountType: e.target.value as DiscountType})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none cursor-pointer"
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
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                    placeholder="EX: 10 ou 1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Date Début (Optionnel)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Date Fin (Optionnel)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Limite d'utilisation (Optionnel)</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={e => setFormData({...formData, usageLimit: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
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
                  className="flex-[1.5] py-4 bg-[#171717] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Créer"}
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
