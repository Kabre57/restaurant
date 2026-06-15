'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, Check, CreditCard, Edit2, Plus, Shield, Trash2 } from 'lucide-react'
import {
  createPaymentMethod,
  deletePaymentMethod,
  ensureDefaultPaymentMethods,
  getPaymentMethods,
  updatePaymentMethod,
} from '@/app/actions/orders/paymentMethods'

type PaymentTypeValue = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'CHECK' | 'MEAL_VOUCHER' | 'GIFT_CARD' | 'OTHER'

type PaymentMethodItem = {
  id: string
  name: string
  type: PaymentTypeValue
  isActive: boolean
  isDefault: boolean
  icon: string | null
  storeId: string | null
  displayOrder: number
}

type PaymentMethodsSettingsProps = {
  storeId?: string
  storeName?: string
  title?: string
  description?: string
  contextLabel?: string
}

const paymentTypeOptions: { value: PaymentTypeValue; label: string }[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'CARD', label: 'Carte Bancaire' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CHECK', label: 'Chèque' },
  { value: 'MEAL_VOUCHER', label: 'Ticket Restaurant' },
  { value: 'GIFT_CARD', label: 'Carte Cadeau' },
  { value: 'OTHER', label: 'Autre' },
]

export function PaymentMethodsSettings({
  storeId,
  storeName,
  title = 'Modes de Paiement',
  description = 'Gérez les méthodes de paiement disponibles dans votre restaurant',
  contextLabel = 'Restaurant',
}: PaymentMethodsSettingsProps) {
  const [methods, setMethods] = useState<PaymentMethodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<PaymentTypeValue>('OTHER')
  const [formIcon, setFormIcon] = useState('💰')

  useEffect(() => {
    if (!storeId) return

    let isCancelled = false
    const targetStoreId = storeId

    async function loadMethods() {
      setIsLoading(true)
      await ensureDefaultPaymentMethods(targetStoreId)
      const result = await getPaymentMethods(targetStoreId)

      if (isCancelled) return

      if (result.success && result.methods) {
        setMethods(result.methods as PaymentMethodItem[])
      } else {
        setMessage({ text: result.error || 'Impossible de charger les moyens de paiement.', type: 'error' })
      }
      setIsLoading(false)
    }

    void loadMethods()

    return () => {
      isCancelled = true
    }
  }, [storeId])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    window.setTimeout(() => setMessage(null), 3000)
  }

  async function refreshMethods() {
    if (!storeId) return
    const result = await getPaymentMethods(storeId)
    if (result.success && result.methods) {
      setMethods(result.methods as PaymentMethodItem[])
    }
  }

  async function handleToggleActive(method: PaymentMethodItem) {
    if (!storeId) return

    const activeCount = methods.filter((item) => item.isActive).length
    if (method.isActive && activeCount <= 1) {
      showMessage('Impossible de désactiver le dernier moyen de paiement actif.', 'error')
      return
    }

    const nextValue = !method.isActive
    const result = await updatePaymentMethod(method.id, { isActive: nextValue })

    if (result.success) {
      setMethods((current) => current.map((item) => item.id === method.id ? { ...item, isActive: nextValue } : item))
      showMessage(`Moyen de paiement ${nextValue ? 'activé' : 'désactivé'} avec succès`, 'success')
    } else {
      showMessage(result.error || 'Erreur de mise à jour', 'error')
    }
  }

  async function handleDelete(id: string, isDefault: boolean) {
    if (isDefault) {
      showMessage('Les moyens de paiement par défaut ne peuvent pas être supprimés.', 'error')
      return
    }
    if (!confirm('Voulez-vous vraiment supprimer ce moyen de paiement ?')) return

    const result = await deletePaymentMethod(id)
    if (result.success) {
      setMethods((current) => current.filter((item) => item.id !== id))
      showMessage('Moyen de paiement supprimé', 'success')
    } else {
      showMessage(result.error || 'Erreur de suppression', 'error')
    }
  }

  function handleOpenModal(method?: PaymentMethodItem) {
    if (method) {
      setEditingId(method.id)
      setFormName(method.name)
      setFormType(method.type)
      setFormIcon(method.icon || '💰')
    } else {
      setEditingId(null)
      setFormName('')
      setFormType('OTHER')
      setFormIcon('💰')
    }
    setIsModalOpen(true)
  }

  async function handleSaveMethod(event: React.FormEvent) {
    event.preventDefault()
    if (!storeId) return

    if (editingId) {
      const result = await updatePaymentMethod(editingId, { name: formName, icon: formIcon })
      if (result.success) {
        showMessage('Moyen de paiement modifié', 'success')
        await refreshMethods()
        setIsModalOpen(false)
      } else {
        showMessage(result.error || 'Erreur', 'error')
      }
      return
    }

    const result = await createPaymentMethod(storeId, {
      name: formName,
      type: formType,
      icon: formIcon,
      displayOrder: methods.length + 1,
    })
    if (result.success) {
      showMessage('Nouveau moyen de paiement ajouté', 'success')
      await refreshMethods()
      setIsModalOpen(false)
    } else {
      showMessage(result.error || 'Erreur', 'error')
    }
  }

  if (!storeId) {
    return (
      <div className="max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800">
        Sélectionnez d'abord un restaurant actif pour configurer ses moyens de paiement.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--parabellum-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">{title}</h1>
            <p className="text-sm font-medium text-gray-500">{description}</p>
            {storeName && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[var(--parabellum-primary)]">
                {contextLabel}: {storeName}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-semibold">
            Les modes actifs ici sont ceux affichés dans la caisse au moment de l'encaissement.
            Désactivez un mode pour le masquer du POS, sans supprimer son historique.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className={`flex items-center justify-between rounded-2xl border p-5 shadow-sm transition-all ${method.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-75'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${method.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {method.icon || '💰'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{method.name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500">
                  <span>Type: {method.type}</span>
                  {method.isDefault && (
                    <span className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
                      <Shield className="h-3 w-3" /> Système
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenModal(method)}
                className="p-2 text-gray-400 transition-colors hover:text-blue-600"
                title="Modifier"
              >
                <Edit2 className="h-4 w-4" />
              </button>

              {!method.isDefault && (
                <button
                  onClick={() => handleDelete(method.id, method.isDefault)}
                  className="p-2 text-gray-400 transition-colors hover:text-red-600"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => handleToggleActive(method)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${method.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
                aria-label={method.isActive ? 'Désactiver' : 'Activer'}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md space-y-6 rounded-[2rem] bg-white p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-black">
              {editingId ? 'Modifier' : 'Nouveau'} mode de paiement
            </h3>

            <form onSubmit={handleSaveMethod} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Nom affiché dans le POS</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Ex: Espèces, Carte Visa..."
                  className="w-full rounded-xl border border-[#e2e8f0] p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                />
              </div>

              {!editingId && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Type de paiement</label>
                  <select
                    value={formType}
                    onChange={(event) => setFormType(event.target.value as PaymentTypeValue)}
                    className="w-full rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                  >
                    {paymentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Icône</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formIcon}
                  onChange={(event) => setFormIcon(event.target.value)}
                  placeholder="Ex: 💵"
                  className="w-full rounded-xl border border-[#e2e8f0] p-4 text-center text-xl font-medium focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl bg-[#f1f3f5] py-4 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-[#e2e8f0]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--parabellum-primary)] py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
                >
                  <Check className="h-4 w-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
