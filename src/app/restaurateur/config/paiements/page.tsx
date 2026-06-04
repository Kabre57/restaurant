'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { CreditCard, Check, Plus, Trash2, Edit2, Shield, AlertTriangle } from 'lucide-react'
import { getPaymentMethods, updatePaymentMethod, createPaymentMethod, deletePaymentMethod } from '@/app/actions/paymentMethods'

type PaymentMethodType = {
  id: string
  name: string
  type: string
  isActive: boolean
  isDefault: boolean
  icon: string | null
  storeId: string | null
  displayOrder: number
}

export default function PaymentSettingsPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [methods, setMethods] = useState<PaymentMethodType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form State
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('OTHER')
  const [formIcon, setFormIcon] = useState('💰')

  useEffect(() => {
    if (!storeId) return
    loadMethods()
  }, [storeId])

  const loadMethods = async () => {
    setIsLoading(true)
    const result = await getPaymentMethods(storeId)
    if (result.success && result.methods) {
      setMethods(result.methods as unknown as PaymentMethodType[])
    }
    setIsLoading(false)
  }

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleToggleActive = async (method: PaymentMethodType) => {
    if (!storeId) return
    
    // Prevent disabling all methods, but for now just prevent disabling if it's the last active
    const activeCount = methods.filter(m => m.isActive).length
    if (method.isActive && activeCount <= 1) {
      showMessage("Impossible de désactiver le dernier moyen de paiement actif.", "error")
      return
    }

    const updated = !method.isActive
    const result = await updatePaymentMethod(method.id, { isActive: updated })
    
    if (result.success) {
      setMethods(methods.map(m => m.id === method.id ? { ...m, isActive: updated } : m))
      showMessage(`Moyen de paiement ${updated ? 'activé' : 'désactivé'} avec succès`, 'success')
    } else {
      showMessage(result.error || "Erreur de mise à jour", 'error')
    }
  }

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      showMessage("Les moyens de paiement par défaut ne peuvent pas être supprimés.", "error")
      return
    }
    if (!confirm("Voulez-vous vraiment supprimer ce moyen de paiement ?")) return

    const result = await deletePaymentMethod(id)
    if (result.success) {
      setMethods(methods.filter(m => m.id !== id))
      showMessage("Moyen de paiement supprimé", "success")
    } else {
      showMessage(result.error || "Erreur de suppression", "error")
    }
  }

  const handleOpenModal = (method?: PaymentMethodType) => {
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

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) return
    
    if (editingId) {
      const result = await updatePaymentMethod(editingId, { name: formName, icon: formIcon })
      if (result.success) {
        showMessage("Moyen de paiement modifié", "success")
        loadMethods()
        setIsModalOpen(false)
      } else {
        showMessage(result.error || "Erreur", "error")
      }
    } else {
      const result = await createPaymentMethod(storeId, {
        name: formName,
        type: formType as any,
        icon: formIcon,
        displayOrder: methods.length + 1
      })
      if (result.success) {
        showMessage("Nouveau moyen de paiement ajouté", "success")
        loadMethods()
        setIsModalOpen(false)
      } else {
        showMessage(result.error || "Erreur", "error")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--parabellum-primary)] border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
              Modes de Paiement
            </h1>
            <p className="text-sm font-medium text-gray-500">
              Gérez les méthodes de paiement disponibles dans votre restaurant
            </p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* ── MESSAGE TOAST ──────────────────────────────────────── */}
      {message && (
        <div
          className={`rounded-xl p-4 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── LISTE DES METHODES ─────────────────────────────────── */}
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
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <span>Type: {method.type}</span>
                  {method.isDefault && (
                    <span className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
                      <Shield className="w-3 h-3" /> Système
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenModal(method)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
              {!method.isDefault && (
                <button
                  onClick={() => handleDelete(method.id, method.isDefault)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => handleToggleActive(method)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${method.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-black">
              {editingId ? 'Modifier' : 'Nouveau'} mode de paiement
            </h3>

            <form onSubmit={handleSaveMethod} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Nom affiché (POS)</label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Espèces, Carte Visa..."
                  className="w-full p-4 rounded-xl border border-[#e2e8f0] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                />
              </div>

              {!editingId && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Type de paiement</label>
                  <select 
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full p-4 rounded-xl border border-[#e2e8f0] bg-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                  >
                    <option value="CASH">Espèces</option>
                    <option value="CARD">Carte Bancaire</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="CHECK">Chèque</option>
                    <option value="MEAL_VOUCHER">Ticket Restaurant</option>
                    <option value="GIFT_CARD">Carte Cadeau</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#72788f]">Icône (Emoji)</label>
                <input 
                  type="text"
                  maxLength={2}
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  placeholder="Ex: 💵"
                  className="w-full p-4 rounded-xl border border-[#e2e8f0] font-medium text-xl text-center focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-[#f1f3f5] hover:bg-[#e2e8f0] text-black font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[var(--parabellum-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
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
