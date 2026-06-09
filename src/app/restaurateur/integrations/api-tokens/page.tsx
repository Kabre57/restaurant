'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from 'lucide-react'
import {
  generateTokenAction,
  listTokensAction,
  revokeTokenAction,
} from '@/app/actions/auth/apiTokens'

interface ApiTokenItem {
  id: string
  name: string
  prefix: string
  createdAt: Date
}

export default function ApiTokensPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [tokens, setTokens] = useState<ApiTokenItem[]>([])
  
  const [tokenName, setTokenName] = useState('')
  const [newRawToken, setNewRawToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── CHARGER LES JETONS ───────────────────────────────────────────
  const loadTokens = useCallback(async () => {
    if (!storeId) return
    setIsLoading(true)
    const res = await listTokensAction(storeId)
    if (res.success && res.tokens) {
      setTokens(res.tokens as unknown as ApiTokenItem[])
    }
    setIsLoading(false)
  }, [storeId])

  useEffect(() => {
    void loadTokens()
  }, [loadTokens])

  // Helpers
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const triggerError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 4000)
  }

  // ── GÉNÉRER LE JETON ─────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId || !tokenName.trim()) return

    setIsSaving(true)
    const res = await generateTokenAction(storeId, tokenName)
    if (res.success && res.apiToken && res.rawToken) {
      setNewRawToken(res.rawToken)
      setTokenName('')
      triggerSuccess('Nouveau jeton d&apos;API généré avec succès.')
      void loadTokens()
    } else {
      triggerError(res.error || 'Erreur lors de la génération.')
    }
    setIsSaving(false)
  }

  // ── RÉVOQUER UN JETON ────────────────────────────────────────────
  const handleRevoke = async (tokenId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer ce jeton ? Toutes les applications connectées avec ce jeton perdront immédiatement l&apos;accès.')) {
      return
    }

    const res = await revokeTokenAction(tokenId)
    if (res.success) {
      triggerSuccess('Jeton d&apos;API révoqué.')
      void loadTokens()
    } else {
      triggerError(res.error || 'Erreur de révocation.')
    }
  }

  // Copier le jeton
  const handleCopy = () => {
    if (!newRawToken) return
    void navigator.clipboard.writeText(newRawToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg">
          <Key className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
            Jetons d&apos;API
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Générez et gérez vos clés d&apos;API sécurisées pour connecter Gourmet POS à vos applications tierces
          </p>
        </div>
      </div>

      {/* ── ALERTS ─────────────────────────────────────────────── */}
      {successMsg && (
        <div className="rounded-2xl p-4 text-sm font-bold bg-green-50 text-green-700 border border-green-200 animate-in fade-in slide-in-from-top-4">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-2xl p-4 text-sm font-bold bg-red-50 text-red-700 border border-red-200 animate-in fade-in slide-in-from-top-4">
          {errorMsg}
        </div>
      )}

      {/* ── ALERTE DE SÉCURITÉ CONCERNANT LE NOUVEAU JETON ─────── */}
      {newRawToken && (
        <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/50 p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-300">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">Notez bien votre clé API !</h3>
              <p className="text-xs text-amber-700 font-medium mt-1">
                Pour des raisons évidentes de sécurité, cette clé d&apos;API ne s&apos;affichera **qu&apos;une seule fois**. Copiez-la et conservez-la dans un endroit sûr avant de quitter cette page.
              </p>
            </div>
          </div>

          {/* Jeton à copier */}
          <div className="flex items-center gap-3 bg-white border border-amber-200 rounded-2xl p-4 shadow-inner">
            <span className="font-mono text-xs font-black text-gray-900 tracking-wider flex-1 overflow-x-auto break-all select-all">
              {newRawToken}
            </span>
            <button
              onClick={handleCopy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-md transition-all"
              title="Copier le jeton"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setNewRawToken(null)}
              className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-xs font-bold text-amber-800 transition-colors"
            >
              J&apos;ai sauvegardé la clé
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE: GENERER JETON */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Créer un Jeton
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Nom de l&apos;intégration (Descriptif)</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="Ex: Apify Lead Hub, Comptabilité Sage..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-gray-300"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Générer la Clé
              </button>
            </form>
          </div>
        </div>

        {/* COLONNE DROITE: JETONS ACTIFS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3">
              Clés API actives ({tokens.length})
            </h2>

            {tokens.length === 0 ? (
              <div className="text-center py-12 text-gray-400 space-y-2">
                <Key className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs font-medium leading-relaxed">
                  Aucun jeton actif créé pour le moment.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-gray-500 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="py-3 px-4">Nom / Application</th>
                      <th className="py-3 px-4">Aperçu Clé</th>
                      <th className="py-3 px-4">Créé le</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {tokens.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">{t.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="bg-gray-100 border border-gray-200 px-2 py-1 rounded text-[10px] font-mono text-gray-700">
                            {t.prefix}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRevoke(t.id)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:border-red-500 text-gray-400 hover:text-red-500 transition-colors"
                            title="Rétrograder / Révoquer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
