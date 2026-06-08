'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, CheckCircle2, ArrowLeft, UtensilsCrossed, Monitor } from 'lucide-react'
import { getStoreSettings, updateStoreSettings } from '@/app/actions/store/storeSettings'
import { WorkflowType } from '@prisma/client'

export default function WorkflowConfigPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [workflowType, setWorkflowType] = useState<WorkflowType>('SERVER_FIRST')

  useEffect(() => {
    const storeId = session?.user?.storeId
    if (!storeId) return

    let isCancelled = false

    async function fetchSettings() {
      setLoading(true)
      const res = await getStoreSettings(storeId as string)
      if (isCancelled) return

      if (res.success && res.settings) {
        setWorkflowType(res.settings.workflowType)
      }
      setLoading(false)
    }

    void fetchSettings()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  async function handleSave() {
    const storeId = session?.user?.storeId
    if (!storeId) return

    setIsSaving(true)
    setMessage('')

    const res = await updateStoreSettings(storeId, { workflowType })

    if (res.success) {
      setMessage('Workflow enregistré avec succès !')
      setTimeout(() => setMessage(''), 3000)
    } else {
      alert(res.error || "Une erreur est survenue lors de l'enregistrement.")
    }
    setIsSaving(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.push('/restaurateur/config')}
            className="group mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#adb5bd] transition-colors hover:text-[#212529]"
          >
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            Retour aux Réglages
          </button>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Workflow de Commande</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            Définissez le processus d&apos;encaissement et d&apos;envoi en cuisine de votre restaurant
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Mode Standard avec Serveur */}
            <div
              onClick={() => setWorkflowType('SERVER_FIRST')}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border p-8 shadow-sm transition-all duration-300 cursor-pointer ${
                workflowType === 'SERVER_FIRST'
                  ? 'border-[#212529] bg-white ring-2 ring-[#212529]'
                  : 'border-[#dee2e6] bg-[#f8f9fa] hover:border-[#212529] hover:bg-white hover:shadow-md'
              }`}
            >
              <div className="space-y-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 ${
                    workflowType === 'SERVER_FIRST' ? 'bg-[#212529] text-white' : 'bg-[#e9ecef] text-[#495057]'
                  }`}
                >
                  <UtensilsCrossed className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-[#212529]">
                    Mode standard (avec serveur)
                  </h3>
                  <p className="text-xs font-bold leading-relaxed text-[#adb5bd] uppercase tracking-wider">
                    Service à table & envoi différé
                  </p>
                  <p className="text-xs text-[#495057] leading-relaxed mt-4">
                    Les serveurs prennent la commande sur tablette ou mobile directement à la table, l&apos;envoient en cuisine pour préparation, et le client paie plus tard au comptoir ou en table.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full border transition-colors duration-300 ${
                    workflowType === 'SERVER_FIRST' ? 'bg-[#FF6D00] border-[#FF6D00]' : 'border-[#dee2e6] bg-transparent'
                  }`}
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">
                  {workflowType === 'SERVER_FIRST' ? 'Sélectionné' : 'Choisir ce mode'}
                </span>
              </div>
            </div>

            {/* Mode Direct Caisse */}
            <div
              onClick={() => setWorkflowType('CASHIER_ONLY')}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border p-8 shadow-sm transition-all duration-300 cursor-pointer ${
                workflowType === 'CASHIER_ONLY'
                  ? 'border-[#212529] bg-white ring-2 ring-[#212529]'
                  : 'border-[#dee2e6] bg-[#f8f9fa] hover:border-[#212529] hover:bg-white hover:shadow-md'
              }`}
            >
              <div className="space-y-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 ${
                    workflowType === 'CASHIER_ONLY' ? 'bg-[#212529] text-white' : 'bg-[#e9ecef] text-[#495057]'
                  }`}
                >
                  <Monitor className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-[#212529]">
                    Mode direct caisse (sans serveur)
                  </h3>
                  <p className="text-xs font-bold leading-relaxed text-[#adb5bd] uppercase tracking-wider">
                    Paiement immédiat au comptoir
                  </p>
                  <p className="text-xs text-[#495057] leading-relaxed mt-4">
                    Idéal pour la vente à emporter, fast-food, boulangerie ou cafétéria. Le client commande au comptoir, paie immédiatement, puis le ticket est envoyé en cuisine. Le plan de salle est désactivé.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full border transition-colors duration-300 ${
                    workflowType === 'CASHIER_ONLY' ? 'bg-[#FF6D00] border-[#FF6D00]' : 'border-[#dee2e6] bg-transparent'
                  }`}
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">
                  {workflowType === 'CASHIER_ONLY' ? 'Sélectionné' : 'Choisir ce mode'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl bg-[#212529] p-5 text-white shadow-xl shadow-[#212529]/20 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              {message ? (
                <div className="flex items-center gap-2 text-[#51cf66]">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Modifications non enregistrées</p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-[#212529] transition-all hover:bg-[#f1f3f5] disabled:opacity-50 sm:w-auto sm:px-10"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
