'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Coins, Check, ArrowUpCircle, ArrowDownCircle, Circle, Ban } from 'lucide-react'
import { getStoreSettings, updateStoreSettings } from '@/app/actions/storeSettings'
import { applyRounding } from '@/lib/roundingUtils'
import type { RoundingType } from '@prisma/client'

// ──────────────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────────────

const ROUNDING_MODES: { value: RoundingType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'NO_ROUNDING',
    label: 'Pas d\'arrondi',
    description: 'Le montant exact est utilisé',
    icon: <Ban className="w-5 h-5" />,
  },
  {
    value: 'ROUND_NEAREST',
    label: 'Au plus proche',
    description: '1327 → 1325, 1328 → 1330',
    icon: <Circle className="w-5 h-5" />,
  },
  {
    value: 'ROUND_UP',
    label: 'Toujours vers le haut',
    description: '1321 → 1325, 1326 → 1330',
    icon: <ArrowUpCircle className="w-5 h-5" />,
  },
  {
    value: 'ROUND_DOWN',
    label: 'Toujours vers le bas',
    description: '1324 → 1320, 1329 → 1325',
    icon: <ArrowDownCircle className="w-5 h-5" />,
  },
]

const ROUNDING_VALUES = [
  { value: 5, label: '5 FCFA', note: 'Recommandé' },
  { value: 10, label: '10 FCFA', note: '' },
  { value: 25, label: '25 FCFA', note: '' },
  { value: 50, label: '50 FCFA', note: '' },
  { value: 100, label: '100 FCFA', note: '' },
]

const PREVIEW_AMOUNTS = [1327, 2543, 4998, 7501, 12345, 685]

// ──────────────────────────────────────────────────────────────────────
// Composant principal
// ──────────────────────────────────────────────────────────────────────

export default function ArrondisPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [rounding, setRounding] = useState<RoundingType>('NO_ROUNDING')
  const [roundingValue, setRoundingValue] = useState(5)

  // ── Chargement initial ───────────────────────────────────────────
  useEffect(() => {
    if (!storeId) return

    const load = async () => {
      setIsLoading(true)
      const result = await getStoreSettings(storeId)
      if (result.success && result.settings) {
        setRounding(result.settings.rounding)
        setRoundingValue(result.settings.roundingValue)
      }
      setIsLoading(false)
    }

    void load()
  }, [storeId])

  // ── Sauvegarde ───────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!storeId) return

    setIsSaving(true)
    const result = await updateStoreSettings(storeId, { rounding, roundingValue })

    if (result.success) {
      setMessage({ text: 'Configuration enregistrée.', type: 'success' })
    } else {
      setMessage({ text: result.error || 'Erreur lors de la sauvegarde.', type: 'error' })
    }

    setIsSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }, [storeId, rounding, roundingValue])

  // ── Loader ───────────────────────────────────────────────────────
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
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
          <Coins className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
            Arrondis de Caisse
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Configuration de l&apos;arrondi pour les paiements en espèces
          </p>
        </div>
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

      <div className="rounded-3xl border border-gray-100 bg-white shadow-xl overflow-hidden">
        <div className="p-6 space-y-8">
          {/* ── SECTION 1: TYPE D'ARRONDI ───────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-black">1</span>
              Type d&apos;arrondi
            </h2>
            <p className="text-xs text-gray-500">
              L&apos;arrondi s&apos;applique <strong>uniquement aux paiements en espèces</strong>. Les paiements par carte ou mobile restent au montant exact.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROUNDING_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setRounding(mode.value)}
                  className={`relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    rounding === mode.value
                      ? 'border-amber-500 bg-amber-50/60 shadow-md shadow-amber-100'
                      : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      rounding === mode.value
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {mode.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${rounding === mode.value ? 'text-amber-900' : 'text-gray-700'}`}>
                      {mode.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${rounding === mode.value ? 'text-amber-700' : 'text-gray-400'}`}>
                      {mode.description}
                    </p>
                  </div>
                  {rounding === mode.value && (
                    <div className="absolute top-3 right-3">
                      <Check className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── SECTION 2: VALEUR D'ARRONDI ────────────────────── */}
          {rounding !== 'NO_ROUNDING' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-black">2</span>
                Valeur d&apos;arrondi
              </h2>
              <p className="text-xs text-gray-500">
                Choisissez l&apos;incrément d&apos;arrondi adapté à votre zone monétaire (FCFA).
              </p>

              <div className="flex flex-wrap gap-2">
                {ROUNDING_VALUES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRoundingValue(item.value)}
                    className={`relative px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
                      roundingValue === item.value
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-md shadow-amber-100'
                        : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    {item.label}
                    {item.note && roundingValue === item.value && (
                      <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        {item.note}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 3: PREVIEW EN TEMPS RÉEL ───────────────── */}
          {rounding !== 'NO_ROUNDING' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-black">3</span>
                Aperçu
              </h2>
              <p className="text-xs text-gray-500">
                Exemples de calcul avec la configuration actuelle.
              </p>

              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                        Montant Original
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                        Montant Arrondi
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                        Différence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {PREVIEW_AMOUNTS.map((amount) => {
                      const rounded = applyRounding(amount, rounding, roundingValue)
                      const diff = rounded - amount

                      return (
                        <tr key={amount} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-700">
                            {amount.toLocaleString()} <span className="text-xs text-gray-400">FCFA</span>
                          </td>
                          <td className="px-4 py-3 font-black text-amber-700">
                            {rounded.toLocaleString()} <span className="text-xs text-amber-500">FCFA</span>
                          </td>
                          <td className={`px-4 py-3 text-right font-bold text-xs ${
                            diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {diff > 0 ? '+' : ''}{diff} FCFA
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER: BOUTON SAUVEGARDER ───────────────────────── */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {rounding === 'NO_ROUNDING'
              ? 'Aucun arrondi ne sera appliqué.'
              : `Arrondi ${rounding === 'ROUND_NEAREST' ? 'au plus proche' : rounding === 'ROUND_UP' ? 'vers le haut' : 'vers le bas'} par incrément de ${roundingValue} FCFA.`}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
