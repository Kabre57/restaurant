'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  ShieldAlert,
  Unlock,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  History,
  TrendingUp,
  AlertCircle,
  FileText,
  UserCheck,
  Calendar,
} from 'lucide-react'
import {
  getActiveShift,
  openShift,
  closeShift,
  payIn,
  payOut,
  getShiftHistory,
} from '@/app/actions/cashDrawer'

interface ShiftOperation {
  id: string
  amount: number
  type: 'PAY_IN' | 'PAY_OUT'
  note: string | null
  createdAt: Date
}

interface CashDrawerShift {
  id: string
  openedByName: string
  openedAt: Date
  closedByName: string | null
  closedAt: Date | null
  startAmount: number
  endAmount: number | null
  expectedAmount: number | null
  status: 'OPEN' | 'CLOSED'
  operations: ShiftOperation[]
}

export default function CashDrawerRotationPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId
  const userId = session?.user?.id || 'cashier_id'
  const userName = session?.user?.name || 'Caissier'

  const [isLoading, setIsLoading] = useState(true)
  const [activeShift, setActiveShift] = useState<CashDrawerShift | null>(null)
  const [history, setHistory] = useState<CashDrawerShift[]>([])

  // Modal / Inputs state
  const [startAmountInput, setStartAmountInput] = useState('')
  const [endAmountInput, setEndAmountInput] = useState('')
  
  // PayIn / PayOut form
  const [opType, setOpType] = useState<'PAY_IN' | 'PAY_OUT'>('PAY_IN')
  const [opAmount, setOpAmount] = useState('')
  const [opNote, setOpNote] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── CHARGEMENT DES DONNÉES ───────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!storeId) return
    setIsLoading(true)

    const activeRes = await getActiveShift(storeId)
    if (activeRes.success && activeRes.shift) {
      setActiveShift(activeRes.shift as unknown as CashDrawerShift)
    } else {
      setActiveShift(null)
    }

    const historyRes = await getShiftHistory(storeId)
    if (historyRes.success && historyRes.history) {
      setHistory(historyRes.history as unknown as CashDrawerShift[])
    }

    setIsLoading(false)
  }, [storeId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Helper alert notifications
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const triggerError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 4000)
  }

  // ── ACTION : OUVRIR LA CAISSE ────────────────────────────────────
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId || !startAmountInput) return

    const amount = parseFloat(startAmountInput)
    if (isNaN(amount) || amount < 0) {
      triggerError('Veuillez entrer un montant valide.')
      return
    }

    const res = await openShift(storeId, userId, userName, amount)
    if (res.success) {
      triggerSuccess('Caisse ouverte avec succès ! Bon service.')
      setStartAmountInput('')
      void loadData()
    } else {
      triggerError(res.error || "Erreur lors de l'ouverture.")
    }
  }

  // ── ACTION : CLÔTURER LA CAISSE ──────────────────────────────────
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeShift || !endAmountInput) return

    const amount = parseFloat(endAmountInput)
    if (isNaN(amount) || amount < 0) {
      triggerError('Veuillez entrer un montant de clôture valide.')
      return
    }

    const res = await closeShift(activeShift.id, userId, userName, amount)
    if (res.success) {
      triggerSuccess('Caisse clôturée avec succès. Rapport mis à jour.')
      setEndAmountInput('')
      void loadData()
    } else {
      triggerError(res.error || 'Erreur lors de la clôture.')
    }
  }

  // ── ACTION : ENTRÉE/SORTIE DE CAISSE ──────────────────────────────
  const handleAddOperation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeShift || !opAmount) return

    const amount = parseFloat(opAmount)
    if (isNaN(amount) || amount <= 0) {
      triggerError('Veuillez entrer un montant positif.')
      return
    }

    const noteText = opNote.trim() || (opType === 'PAY_IN' ? 'Entrée de caisse manuelle' : 'Sortie de caisse manuelle')

    let res
    if (opType === 'PAY_IN') {
      res = await payIn(activeShift.id, amount, noteText)
    } else {
      res = await payOut(activeShift.id, amount, noteText)
    }

    if (res.success) {
      triggerSuccess('Mouvement de caisse enregistré.')
      setOpAmount('')
      setOpNote('')
      void loadData()
    } else {
      triggerError(res.error || "Erreur de l'opération.")
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
    <div className="space-y-6 max-w-6xl">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
              Rotation de Poste
            </h1>
            <p className="text-sm font-medium text-gray-500">
              Gérez les quarts de travail, les fonds de caisse initial/final et suivez les flux d&apos;espèces
            </p>
          </div>
        </div>

        {activeShift ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-widest animate-pulse">
            <Unlock className="w-3.5 h-3.5" />
            Caisse Ouverte
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-gray-50 border border-gray-200 text-gray-400 uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            Caisse Clôturée
          </span>
        )}
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

      {/* ── SECTION PRINCIPALE : STATUT DE LA CAISSE ACTIVE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE: ÉTAT DE LA CAISSE */}
        <div className="lg:col-span-8 space-y-6">
          
          {activeShift ? (
            /* SI LA CAISSE EST OUVERTE */
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Session Active</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Ouverte par : {activeShift.openedByName} • le {new Date(activeShift.openedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fond Initial</span>
                  <span className="text-lg font-black text-gray-900">{activeShift.startAmount.toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Mouvements enregistrés pendant la rotation */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Flux d&apos;espèces du shift</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Entrées (Pay-In)</span>
                    <span className="text-base font-black text-emerald-600 mt-2">
                      +{activeShift.operations.filter(o => o.type === 'PAY_IN').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sorties (Pay-Out)</span>
                    <span className="text-base font-black text-rose-500 mt-2">
                      -{activeShift.operations.filter(o => o.type === 'PAY_OUT').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-2xl p-4 border border-orange-100 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">Opérations totales</span>
                    <span className="text-base font-black text-orange-700 mt-2">
                      {activeShift.operations.length} transaction(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Liste détaillée des opérations de caisse */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Journal des ajustements de caisse</h3>
                {activeShift.operations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune entrée/sortie manuelle pour le moment.</p>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                    {activeShift.operations.map((op) => (
                      <div key={op.id} className="flex items-center justify-between py-2 text-xs">
                        <div className="flex items-center gap-2">
                          {op.type === 'PAY_IN' ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-50 text-rose-600">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-gray-800">{op.note}</p>
                            <p className="text-[9px] text-gray-400">{new Date(op.createdAt).toLocaleTimeString('fr-FR')}</p>
                          </div>
                        </div>
                        <span className={`font-black ${op.type === 'PAY_IN' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {op.type === 'PAY_IN' ? '+' : '-'}{op.amount.toLocaleString()} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire Clôture */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-600" />
                  Clôture & Contrôle de Caisse
                </h3>
                <form onSubmit={handleCloseShift} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-8 space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Comptage Réel (Espèces mesurées dans le tiroir)</label>
                    <input
                      type="number"
                      value={endAmountInput}
                      onChange={(e) => setEndAmountInput(e.target.value)}
                      placeholder="Entrez le montant mesuré (FCFA)"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="sm:col-span-4 w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all"
                  >
                    Fermer la Caisse
                  </button>
                </form>
              </div>

            </div>
          ) : (
            /* SI LA CAISSE EST CLÔTURÉE: INVITER À L'OUVRIR */
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-md">
                <Unlock className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Ouvrir une nouvelle rotation</h2>
                <p className="text-xs text-gray-500 font-medium">
                  Pour commencer à encaisser des commandes sur Gourmet POS, veuillez renseigner le fond de caisse initial dans votre tiroir.
                </p>
              </div>

              <form onSubmit={handleOpenShift} className="max-w-sm mx-auto space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fond de caisse initial (FCFA)</label>
                  <input
                    type="number"
                    value={startAmountInput}
                    onChange={(e) => setStartAmountInput(e.target.value)}
                    placeholder="Ex: 50,000 FCFA"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all"
                >
                  Confirmer l&apos;ouverture
                </button>
              </form>
            </div>
          )}

        </div>

        {/* COLONNE DROITE: MOUVEMENTS DE CAISSE RAPIDES */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Ajustements Rapides
            </h2>

            {activeShift ? (
              <form onSubmit={handleAddOperation} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type d&apos;ajustement</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOpType('PAY_IN')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        opType === 'PAY_IN'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-black'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      Ajout (Pay-In)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpType('PAY_OUT')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        opType === 'PAY_OUT'
                          ? 'bg-rose-50 border-rose-300 text-rose-700 font-black'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      Retrait (Pay-Out)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Montant (FCFA)</label>
                  <input
                    type="number"
                    value={opAmount}
                    onChange={(e) => setOpAmount(e.target.value)}
                    placeholder="Ex: 5,000 FCFA"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Motif (Note)</label>
                  <input
                    type="text"
                    value={opNote}
                    onChange={(e) => setOpNote(e.target.value)}
                    placeholder="Fournisseur, monnaie, repas..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-black active:scale-95 py-2.5 text-xs font-bold text-white transition-all"
                >
                  Enregistrer
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-gray-400 space-y-2">
                <ShieldAlert className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs font-medium leading-relaxed">
                  Veuillez ouvrir la caisse pour effectuer des ajustements d&apos;espèces.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── HISTORIQUE DES ROTATIONS ─────────────────────────────── */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
          <History className="w-4 h-4 text-orange-600" />
          Historique des rotations de caisse
        </h2>

        {history.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-4">Aucun poste clôturé dans l&apos;historique.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-gray-500 border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="py-3 px-4">Date de Rotation</th>
                  <th className="py-3 px-4">Caissier</th>
                  <th className="py-3 px-4 text-right">Fond Initial</th>
                  <th className="py-3 px-4 text-right">Réel Clôture</th>
                  <th className="py-3 px-4 text-right">Attendu</th>
                  <th className="py-3 px-4 text-right">Écart</th>
                  <th className="py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((h) => {
                  const ecart = h.endAmount !== null && h.expectedAmount !== null
                    ? h.endAmount - h.expectedAmount
                    : null

                  return (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(h.openedAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <span className="text-[9px] text-gray-400 block mt-0.5">
                          {new Date(h.openedAt).toLocaleTimeString('fr-FR')}
                          {h.closedAt && ` - ${new Date(h.closedAt).toLocaleTimeString('fr-FR')}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-gray-700 font-bold">
                          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                          <span>{h.openedByName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {h.startAmount.toLocaleString()} FCFA
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {h.endAmount !== null ? `${h.endAmount.toLocaleString()} FCFA` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {h.expectedAmount !== null ? `${h.expectedAmount.toLocaleString()} FCFA` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {ecart !== null ? (
                          ecart === 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black">
                              Parfait
                            </span>
                          ) : ecart > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black">
                              +{ecart.toLocaleString()} FCFA
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black">
                              {ecart.toLocaleString()} FCFA
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {h.status === 'CLOSED' ? (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">
                            Clôturé
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 animate-pulse">
                            En cours
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
