'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Power, Loader2, Calendar, Ticket, X, Clock } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getPromotions, createPromotion, deletePromotion, togglePromotionStatus } from '@/app/actions/promotions'
import { getProductsByStore, getCategories } from '@/app/actions/products'
import { DiscountType } from '@prisma/client'
import { AlertModal } from '@/components/pos/subcomponents/AlertModal'

export default function ReductionsPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [promotions, setPromotions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
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
    endDate: '',
    minOrderAmount: '',
    maxDiscount: '',
    applicableTo: 'ALL',
    applicableId: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [] as number[]
  })

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const [pData, cats, prods] = await Promise.all([
        getPromotions(),
        getCategories(storeId),
        getProductsByStore(storeId)
      ])
      setPromotions(pData)
      setCategories(cats)
      setProducts(prods)
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
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        applicableTo: formData.applicableTo,
        applicableId: formData.applicableTo !== 'ALL' ? formData.applicableId : undefined,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        daysOfWeek: formData.daysOfWeek
      })

      if (res.success) {
        setAlert({ title: "Succès", message: "Réduction créée avec succès", type: 'success' })
        setShowModal(false)
        setFormData({
          code: '',
          discountType: 'PERCENTAGE',
          value: '',
          usageLimit: '',
          startDate: '',
          endDate: '',
          minOrderAmount: '',
          maxDiscount: '',
          applicableTo: 'ALL',
          applicableId: '',
          startTime: '',
          endTime: '',
          daysOfWeek: []
        })
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
            
            // Résolution des libellés cibles
            let targetLabel = 'Toute la commande'
            if (promo.applicableTo === 'PRODUCT') {
              const prod = products.find(p => p.id === promo.applicableId)
              targetLabel = `Produit : ${prod ? prod.name : 'Inconnu'}`
            } else if (promo.applicableTo === 'CATEGORY') {
              const cat = categories.find(c => c.id === promo.applicableId)
              targetLabel = `Catégorie : ${cat ? cat.name : 'Inconnue'}`
            }

            // Résolution des jours applicables
            const daysNamesShort = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
            const daysLabel = promo.daysOfWeek && promo.daysOfWeek.length > 0
              ? promo.daysOfWeek.map((d: number) => daysNamesShort[d]).join(', ')
              : 'Tous les jours'

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
                    <Ticket className="w-4 h-4 text-[#FF6D00]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">{targetLabel}</span>
                  </div>
                  {(promo.startTime || promo.endTime) && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">HH : {promo.startTime || '00:00'} - {promo.endTime || '23:59'}</span>
                    </div>
                  )}
                  {promo.daysOfWeek && promo.daysOfWeek.length > 0 && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Calendar className="w-4 h-4 text-[#FF6D00]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF6D00]">{daysLabel}</span>
                    </div>
                  )}
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
                  {promo.minOrderAmount > 0 && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Min. Commande: {promo.minOrderAmount} FCFA</span>
                    </div>
                  )}
                  {promo.maxDiscount !== null && promo.maxDiscount !== undefined && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Calendar className="w-4 h-4 text-rose-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Remise Max: {promo.maxDiscount} FCFA</span>
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
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <div className="relative">
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-0 right-0 p-2 text-[#adb5bd] hover:text-[#212529]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight mb-8">Nouvelle Réduction</h2>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colonne Gauche */}
              <div className="space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Min. Commande (Optionnel)</label>
                    <input
                      type="number"
                      value={formData.minOrderAmount}
                      onChange={e => setFormData({...formData, minOrderAmount: e.target.value})}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                      placeholder="Min. FCFA"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Remise Max. (Optionnel)</label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={e => setFormData({...formData, maxDiscount: e.target.value})}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                      placeholder="Max. FCFA"
                    />
                  </div>
                </div>
              </div>

              {/* Colonne Droite */}
              <div className="space-y-6">
                {/* Ciblage Applicabilité */}
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Ciblage de la Promotion</label>
                  <select
                    value={formData.applicableTo}
                    onChange={e => setFormData({...formData, applicableTo: e.target.value, applicableId: ''})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Toute la commande (Panier complet)</option>
                    <option value="PRODUCT">Produit spécifique</option>
                    <option value="CATEGORY">Catégorie spécifique</option>
                  </select>
                </div>

                {formData.applicableTo === 'PRODUCT' && (
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Sélectionner le Produit Cible</label>
                    <select
                      value={formData.applicableId}
                      onChange={e => setFormData({...formData, applicableId: e.target.value})}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choisissez un produit --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.applicableTo === 'CATEGORY' && (
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Sélectionner la Catégorie Cible</label>
                    <select
                      value={formData.applicableId}
                      onChange={e => setFormData({...formData, applicableId: e.target.value})}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choisissez une catégorie --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Happy Hour Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Heure Début (Happy Hour)</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={e => setFormData({...formData, startTime: e.target.value})}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Heure Fin (Happy Hour)</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Jours de la semaine */}
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Jours applicables (Sélection multiple)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((dayName, idx) => {
                      const isSelected = formData.daysOfWeek.includes(idx)
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormData({...formData, daysOfWeek: formData.daysOfWeek.filter(d => d !== idx)})
                            } else {
                              setFormData({...formData, daysOfWeek: [...formData.daysOfWeek, idx]})
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                            isSelected 
                              ? 'bg-[#FF6D00] text-white' 
                              : 'bg-[#f1f3f5] text-[#495057] hover:bg-[#e9ecef]'
                          }`}
                        >
                          {dayName}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[9px] text-[#adb5bd] mt-1 font-bold">Laissez vide pour appliquer tous les jours de la semaine.</p>
                </div>
              </div>

              {/* Boutons d'action en bas - Pleine largeur */}
              <div className="col-span-1 md:col-span-2 flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:gap-4 border-t border-[#f1f3f5]">
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
