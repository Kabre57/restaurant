'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Power, Loader2, Calendar, Ticket, X, Clock, Store } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { DiscountType } from '@prisma/client'
import { getPromotions, createPromotion, deletePromotion, togglePromotionStatus } from '@/app/actions/catalog/promotions'
import { getProductsByStore, getCategories } from '@/app/actions/catalog/products'
import { AlertModal } from '@/components/pos/subcomponents/AlertModal'

type PromotionRecord = Awaited<ReturnType<typeof getPromotions>>[number]
type CategoryRecord = Awaited<ReturnType<typeof getCategories>>[number]
type ProductRecord = Awaited<ReturnType<typeof getProductsByStore>>[number]

type StoreOption = {
  id: string
  name: string
}

type PromotionManagerProps = {
  mode: 'admin' | 'restaurateur'
  initialStoreId?: string
  stores?: StoreOption[]
  title?: string
  description?: string
  createLabel?: string
}

type PromoFormState = {
  code: string
  discountType: DiscountType
  value: string
  usageLimit: string
  startDate: string
  endDate: string
  minOrderAmount: string
  maxDiscount: string
  applicableTo: string
  applicableId: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
}

const emptyForm: PromoFormState = {
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
  daysOfWeek: [],
}

const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function PromotionManager({
  mode,
  initialStoreId = '',
  stores = [],
  title = 'Reductions & Promotions',
  description = 'Creez et gerez les codes de reduction applicables sur le point de vente',
  createLabel = 'Nouvelle Reduction',
}: PromotionManagerProps) {
  const { data: session, status } = useSession()
  const [activeStoreId, setActiveStoreId] = useState(initialStoreId || stores[0]?.id || '')
  const [promotions, setPromotions] = useState<PromotionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ title: string, message: string, type?: 'error' | 'success' } | null>(null)
  const [formData, setFormData] = useState<PromoFormState>(emptyForm)

  useEffect(() => {
    if (mode === 'admin' && initialStoreId && initialStoreId !== activeStoreId) {
      setActiveStoreId(initialStoreId)
    }
  }, [activeStoreId, initialStoreId, mode])

  const sessionStoreId = session?.user?.storeId
  const targetStoreId = mode === 'admin' ? activeStoreId : sessionStoreId
  const activeStoreName = mode === 'admin'
    ? stores.find((store) => store.id === activeStoreId)?.name
    : undefined

  async function loadData(storeId: string) {
    try {
      setLoading(true)
      const [promotionRows, categoryRows, productRows] = await Promise.all([
        getPromotions(storeId),
        getCategories(storeId),
        getProductsByStore(storeId),
      ])
      setPromotions(promotionRows)
      setCategories(categoryRows)
      setProducts(productRows)
    } catch (err) {
      console.error(err)
      setAlert({ title: 'Erreur', message: 'Impossible de charger les promotions.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'restaurateur' && status === 'loading') return
    if (!targetStoreId) {
      setLoading(false)
      return
    }
    void loadData(targetStoreId)
  }, [mode, status, targetStoreId])

  function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId)
    if (typeof document !== 'undefined') {
      document.cookie = `admin_active_store_id=${storeId}; path=/; max-age=31536000; SameSite=Lax`
      localStorage.setItem('admin_active_store_id', storeId)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetStoreId) {
      setAlert({ title: 'Restaurant requis', message: 'Veuillez selectionner un restaurant.' })
      return
    }

    if (!formData.code || !formData.value) {
      setAlert({ title: 'Champs requis', message: 'Veuillez remplir tous les champs obligatoires.' })
      return
    }

    if (formData.applicableTo !== 'ALL' && !formData.applicableId) {
      setAlert({ title: 'Ciblage requis', message: 'Veuillez choisir le produit ou la categorie cible.' })
      return
    }

    try {
      setIsSubmitting(true)
      const res = await createPromotion({
        code: formData.code,
        discountType: formData.discountType,
        value: parseFloat(formData.value),
        storeId: targetStoreId,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        applicableTo: formData.applicableTo,
        applicableId: formData.applicableTo !== 'ALL' ? formData.applicableId : undefined,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        daysOfWeek: formData.daysOfWeek,
      })

      if (res.success) {
        setAlert({ title: 'Succes', message: 'Promotion creee avec succes', type: 'success' })
        setShowModal(false)
        setFormData(emptyForm)
        await loadData(targetStoreId)
      } else {
        setAlert({ title: 'Erreur', message: res.error || 'Echec de la creation' })
      }
    } catch (err) {
      console.error(err)
      setAlert({ title: 'Erreur', message: "Une erreur technique s'est produite." })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette promotion ?')) return
    const res = await deletePromotion(id)
    if (res.success && targetStoreId) {
      await loadData(targetStoreId)
    } else if (!res.success) {
      setAlert({ title: 'Erreur', message: res.error || 'Echec de la suppression' })
    }
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await togglePromotionStatus(id, !current)
    if (res.success && targetStoreId) {
      await loadData(targetStoreId)
    } else if (!res.success) {
      setAlert({ title: 'Erreur', message: res.error || 'Echec de la modification' })
    }
  }

  function getPromoStatus(promo: PromotionRecord) {
    if (!promo.isActive) return { label: 'Inactif', color: 'bg-[#f1f3f5] text-[#adb5bd]' }
    const now = new Date()
    if (promo.startDate && new Date(promo.startDate) > now) {
      return { label: 'A venir', color: 'bg-[#fff9db] text-[#f08c00]' }
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      return { label: 'Expire', color: 'bg-[#fff5f5] text-[#e03131]' }
    }
    return { label: 'Actif', color: 'bg-[#ebfbee] text-[#2f9e44]' }
  }

  function getTargetLabel(promo: PromotionRecord) {
    if (promo.applicableTo === 'PRODUCT') {
      const product = products.find((item) => item.id === promo.applicableId)
      return `Produit : ${product ? product.name : 'Inconnu'}`
    }
    if (promo.applicableTo === 'CATEGORY') {
      const category = categories.find((item) => item.id === promo.applicableId)
      return `Categorie : ${category ? category.name : 'Inconnue'}`
    }
    return 'Toute la commande'
  }

  function getDaysLabel(daysOfWeek: number[]) {
    return daysOfWeek.length > 0
      ? daysOfWeek.map((day) => dayLabels[day] ?? '').filter(Boolean).join(', ')
      : 'Tous les jours'
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">{title}</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">{description}</p>
          {mode === 'admin' && activeStoreName && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#e9ecef] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#495057]">
              <Store className="h-3.5 w-3.5 text-[#FF6D00]" />
              {activeStoreName}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {mode === 'admin' && stores.length > 0 && (
            <select
              value={activeStoreId}
              onChange={(event) => handleStoreChange(event.target.value)}
              className="rounded-2xl border border-[#dee2e6] bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-[#495057] outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowModal(true)}
            disabled={!targetStoreId}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6D00] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-[#E66200] disabled:cursor-not-allowed disabled:bg-[#adb5bd] sm:w-auto sm:px-8"
          >
            <Plus className="w-5 h-5" />
            {createLabel}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : promotions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dee2e6] bg-white px-6 py-16 text-center">
          <Ticket className="mx-auto h-10 w-10 text-[#adb5bd]" />
          <p className="mt-4 text-sm font-black uppercase tracking-widest text-[#212529]">Aucune promotion</p>
          <p className="mt-1 text-xs font-bold text-[#adb5bd]">Les reductions creees pour ce restaurant apparaitront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promo) => {
            const statusConfig = getPromoStatus(promo)
            const daysLabel = getDaysLabel(promo.daysOfWeek)

            return (
              <div key={promo.id} className="bg-white p-6 rounded-[2rem] border border-[#dee2e6] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl ${promo.isActive ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#f1f3f5] text-[#adb5bd]'}`}>
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(promo.id, promo.isActive)} className="p-2 hover:bg-[#f8f9fa] rounded-lg text-[#495057]" title="Activer/Desactiver">
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
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>

                <div className="pt-6 border-t border-[#f1f3f5] space-y-3">
                  <div className="flex items-center gap-3 text-[#adb5bd]">
                    <Ticket className="w-4 h-4 text-[#FF6D00]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">{getTargetLabel(promo)}</span>
                  </div>
                  {(promo.startTime || promo.endTime) && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">HH : {promo.startTime || '00:00'} - {promo.endTime || '23:59'}</span>
                    </div>
                  )}
                  {promo.daysOfWeek.length > 0 && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Calendar className="w-4 h-4 text-[#FF6D00]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF6D00]">{daysLabel}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[#adb5bd]">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Utilise: {promo.usedCount} {promo.usageLimit ? `/ ${promo.usageLimit}` : ''}</span>
                  </div>
                  {promo.startDate && (
                    <div className="flex items-center gap-3 text-[#adb5bd]">
                      <Calendar className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Debut: {new Date(promo.startDate).toLocaleDateString('fr-FR')}</span>
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

            <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight mb-8">Nouvelle Promotion</h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Code Promo / Reduction</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(event) => setFormData({ ...formData, code: event.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                    placeholder="EX: REMISE10, VIP2024"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Type</label>
                    <select
                      value={formData.discountType}
                      onChange={(event) => setFormData({ ...formData, discountType: event.target.value as DiscountType })}
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
                      onChange={(event) => setFormData({ ...formData, value: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                      placeholder="EX: 10 ou 1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Date Debut</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Date Fin</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Limite d'utilisation</label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(event) => setFormData({ ...formData, usageLimit: event.target.value })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                    placeholder="Illimite"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Min. Commande</label>
                    <input
                      type="number"
                      value={formData.minOrderAmount}
                      onChange={(event) => setFormData({ ...formData, minOrderAmount: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                      placeholder="Min. FCFA"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Remise Max.</label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(event) => setFormData({ ...formData, maxDiscount: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/25"
                      placeholder="Max. FCFA"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Ciblage de la Promotion</label>
                  <select
                    value={formData.applicableTo}
                    onChange={(event) => setFormData({ ...formData, applicableTo: event.target.value, applicableId: '' })}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Toute la commande</option>
                    <option value="PRODUCT">Produit specifique</option>
                    <option value="CATEGORY">Categorie specifique</option>
                  </select>
                </div>

                {formData.applicableTo === 'PRODUCT' && (
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Produit Cible</label>
                    <select
                      value={formData.applicableId}
                      onChange={(event) => setFormData({ ...formData, applicableId: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">Choisissez un produit</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.applicableTo === 'CATEGORY' && (
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Categorie Cible</label>
                    <select
                      value={formData.applicableId}
                      onChange={(event) => setFormData({ ...formData, applicableId: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">Choisissez une categorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Heure Debut</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(event) => setFormData({ ...formData, startTime: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Heure Fin</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(event) => setFormData({ ...formData, endTime: event.target.value })}
                      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block mb-2">Jours applicables</label>
                  <div className="flex flex-wrap gap-2">
                    {dayLabels.map((dayName, index) => {
                      const isSelected = formData.daysOfWeek.includes(index)
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              daysOfWeek: isSelected
                                ? formData.daysOfWeek.filter((day) => day !== index)
                                : [...formData.daysOfWeek, index],
                            })
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
                  <p className="text-[9px] text-[#adb5bd] mt-1 font-bold">Laissez vide pour appliquer tous les jours.</p>
                </div>
              </div>

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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Creer'}
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
