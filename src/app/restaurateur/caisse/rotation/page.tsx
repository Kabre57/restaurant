'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Unlock,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  History,
  TrendingUp,
  FileText,
  UserCheck,
  Calendar,
  Printer,
  Download,
  PlusCircle,
  MinusCircle,
  HelpCircle,
} from 'lucide-react'
import {
  getActiveShift,
  openShift,
  getShiftHistory,
} from '@/app/actions/cashDrawer'
import PayInOutModal from '@/components/restaurateur/PayInOutModal'
import CloseShiftModal from '@/components/restaurateur/CloseShiftModal'

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
  storeId: string
}

export default function CashDrawerRotationPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId
  const userId = session?.user?.id || 'cashier_id'
  const userName = session?.user?.name || 'Caissier'

  const [isLoading, setIsLoading] = useState(true)
  const [activeShift, setActiveShift] = useState<CashDrawerShift | null>(null)
  const [totalCashSales, setTotalCashSales] = useState(0)
  const [expectedAmount, setExpectedAmount] = useState(0)
  const [history, setHistory] = useState<CashDrawerShift[]>([])

  // Modal / Inputs state
  const [startAmountInput, setStartAmountInput] = useState('')
  const [isPayInOutOpen, setIsPayInOutOpen] = useState(false)
  const [payInOutType, setPayInOutType] = useState<'PAY_IN' | 'PAY_OUT'>('PAY_IN')
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── CHARGEMENT DES DONNÉES ───────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!storeId) return
    setIsLoading(true)

    const activeRes = await getActiveShift(storeId)
    if (activeRes.success && activeRes.shift) {
      setActiveShift(activeRes.shift as unknown as CashDrawerShift)
      setTotalCashSales(activeRes.totalCashSales || 0)
      setExpectedAmount(activeRes.expectedAmount || 0)
    } else {
      setActiveShift(null)
      setTotalCashSales(0)
      setExpectedAmount(0)
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

  // ── EXPORT CSV (Separated by Semicolon for French Excel) ─────────
  const exportToCSV = () => {
    if (history.length === 0) {
      triggerError('Aucun shift dans l\'historique à exporter.')
      return
    }

    const headers = [
      'Date Ouverture',
      'Date Clôture',
      'Caissier',
      'Fond Initial (FCFA)',
      'Réel Clôture (FCFA)',
      'Attendu (FCFA)',
      'Écart (FCFA)',
      'Statut'
    ]

    const rows = history.map(s => {
      const openedAt = new Date(s.openedAt).toLocaleString('fr-FR').replace(/"/g, '""')
      const closedAt = s.closedAt ? new Date(s.closedAt).toLocaleString('fr-FR').replace(/"/g, '""') : '—'
      const ecart = s.endAmount !== null && s.expectedAmount !== null ? s.endAmount - s.expectedAmount : 0
      return [
        `"${openedAt}"`,
        `"${closedAt}"`,
        `"${s.openedByName.replace(/"/g, '""')}"`,
        s.startAmount,
        s.endAmount !== null ? s.endAmount : '—',
        s.expectedAmount !== null ? s.expectedAmount : '—',
        ecart,
        s.status === 'CLOSED' ? 'Cloture' : 'Ouvert'
      ]
    })

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `historique_shifts_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    triggerSuccess('Historique exporté au format CSV.')
  }

  // ── IMPRESSION DU RAPPORT DE ROTATION ────────────────────────────
  const printShiftReport = (shift: CashDrawerShift) => {
    const printWindow = window.open('', '_blank', 'width=650,height=850')
    if (!printWindow) {
      triggerError('Le bloqueur de fenêtres contextuelles a empêché l\'impression.')
      return
    }

    // Calculer les ventes en espèces
    const totalPayIn = shift.operations
      .filter(o => o.type === 'PAY_IN')
      .reduce((acc, curr) => acc + curr.amount, 0)
    const totalPayOut = shift.operations
      .filter(o => o.type === 'PAY_OUT')
      .reduce((acc, curr) => acc + curr.amount, 0)

    // Si le shift est fermé, la vente en espèce est (expectedAmount - startAmount - payIn + payOut)
    // Sinon on utilise la variable d'état totalCashSales
    const cashSales = shift.status === 'CLOSED' && shift.expectedAmount !== null
      ? (shift.expectedAmount - shift.startAmount - totalPayIn + totalPayOut)
      : (shift.id === activeShift?.id ? totalCashSales : 0)

    const expected = shift.expectedAmount !== null 
      ? shift.expectedAmount 
      : (shift.startAmount + cashSales + totalPayIn - totalPayOut)

    const reel = shift.endAmount !== null ? shift.endAmount : null
    const ecart = reel !== null ? (reel - expected) : null

    const operationsHtml = shift.operations.length > 0 
      ? `
        <h3 style="font-size: 11px; font-weight: 800; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 25px; text-transform: uppercase;">
          Journal des Ajustements
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 1px solid #333; text-align: left; font-weight: bold;">
              <th style="padding: 5px 0;">Heure</th>
              <th style="padding: 5px 0;">Type</th>
              <th style="padding: 5px 0;">Motif / Note</th>
              <th style="padding: 5px 0; text-align: right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${shift.operations.map(op => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 5px 0;">${new Date(op.createdAt).toLocaleTimeString('fr-FR')}</td>
                <td style="padding: 5px 0; font-weight: bold; color: ${op.type === 'PAY_IN' ? '#059669' : '#dc2626'}">
                  ${op.type === 'PAY_IN' ? 'Entrée (Pay-in)' : 'Sortie (Pay-out)'}
                </td>
                <td style="padding: 5px 0; color: #555;">${op.note || '—'}</td>
                <td style="padding: 5px 0; text-align: right; font-weight: bold;">
                  ${op.amount.toLocaleString()} FCFA
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<p style="font-size: 11px; color: #666; font-style: italic; margin-top: 20px;">Aucun ajustement d\'espèces enregistré durant ce shift.</p>'

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport de Clôture - Caisse</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              margin: 30px;
              color: #000;
              background-color: #fff;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 16px;
              text-transform: uppercase;
            }
            .info-grid {
              font-size: 11px;
              margin-bottom: 15px;
            }
            .info-grid div {
              margin-bottom: 3px;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .summary-table td {
              padding: 6px 0;
              font-size: 11px;
              border-bottom: 1px dashed #ccc;
            }
            .summary-table tr.total-row td {
              font-weight: bold;
              font-size: 12px;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 8px 0;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 10px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RAPPORT DE ROTATION</h1>
            <p style="margin: 3px 0 0 0; font-size: 11px; font-weight: bold;">Gourmet POS System</p>
          </div>

          <div class="info-grid">
            <div><strong>Shift ID:</strong> ${shift.id}</div>
            <div><strong>Caissier:</strong> ${shift.openedByName}</div>
            <div><strong>Date Ouverture:</strong> ${new Date(shift.openedAt).toLocaleString('fr-FR')}</div>
            ${shift.closedAt ? `<div><strong>Date Clôture:</strong> ${new Date(shift.closedAt).toLocaleString('fr-FR')}</div>` : '<div><strong>Date Clôture:</strong> En cours</div>'}
            <div><strong>Statut:</strong> ${shift.status === 'CLOSED' ? 'CLÔTURÉ' : 'OUVERT'}</div>
          </div>

          <table class="summary-table">
            <tr>
              <td>Fond de caisse initial</td>
              <td style="text-align: right; font-weight: bold;">${shift.startAmount.toLocaleString()} FCFA</td>
            </tr>
            <tr>
              <td>Ventes en espèces</td>
              <td style="text-align: right; font-weight: bold;">+${cashSales.toLocaleString()} FCFA</td>
            </tr>
            <tr>
              <td>Entrées (Pay-In)</td>
              <td style="text-align: right; font-weight: bold; color: #059669;">+${totalPayIn.toLocaleString()} FCFA</td>
            </tr>
            <tr>
              <td>Sorties (Pay-Out)</td>
              <td style="text-align: right; font-weight: bold; color: #dc2626;">-${totalPayOut.toLocaleString()} FCFA</td>
            </tr>
            <tr class="total-row">
              <td>Montant Attendu</td>
              <td style="text-align: right;">${expected.toLocaleString()} FCFA</td>
            </tr>
            <tr>
              <td>Montant Réel Clôture</td>
              <td style="text-align: right; font-weight: bold;">${reel !== null ? `${reel.toLocaleString()} FCFA` : 'Non renseigné'}</td>
            </tr>
            ${ecart !== null ? `
            <tr style="font-weight: bold; background-color: #f3f4f6;">
              <td style="padding: 8px 5px;">Écart de caisse</td>
              <td style="text-align: right; padding: 8px 5px;">
                ${ecart === 0 ? 'Parfait (0)' : ecart > 0 ? `Excédent (+${ecart.toLocaleString()})` : `Déficit (${ecart.toLocaleString()})`} FCFA
              </td>
            </tr>
            ` : ''}
          </table>

          ${operationsHtml}

          <div class="footer">
            <p>Généré le ${new Date().toLocaleString('fr-FR')} - Gourmet POS</p>
            <p>Signature Caissier: ____________________</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--parabellum-primary)] border-t-transparent"></div>
      </div>
    )
  }

  // Calculate quick stats for active shift operations
  const activePayIn = activeShift 
    ? activeShift.operations.filter(o => o.type === 'PAY_IN').reduce((acc, curr) => acc + curr.amount, 0)
    : 0
  const activePayOut = activeShift 
    ? activeShift.operations.filter(o => o.type === 'PAY_OUT').reduce((acc, curr) => acc + curr.amount, 0)
    : 0

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
              Rotation de Poste
            </h1>
            <p className="text-sm font-medium text-gray-500">
              Gérez les quarts de travail, les fonds de caisse et suivez les flux d&apos;espèces
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {/* ── SECTIONS PRINCIPALES ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE: ÉTAT OUVERT / FORMULAIRE OUVERTURE */}
        <div className="lg:col-span-8 space-y-6">
          
          {activeShift ? (
            /* SI LA CAISSE EST OUVERTE: AFFICHER LES INFOS DU SHIFT ACTUEL */
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-6">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Session Active</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                      Ouverte par : {activeShift.openedByName} • le {new Date(activeShift.openedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                
                {/* Print Active Report */}
                <button
                  onClick={() => printShiftReport(activeShift)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 active:scale-95 transition-all text-xs font-bold w-fit"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer rapport live
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Fond Initial</span>
                  <span className="text-lg font-black text-gray-900 mt-2">
                    {activeShift.startAmount.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ventes Espèces (CASH)</span>
                  <span className="text-lg font-black text-emerald-600 mt-2">
                    +{totalCashSales.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">Montant Attendu</span>
                  <span className="text-lg font-black text-orange-700 mt-2">
                    {expectedAmount.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              {/* Quick adjustments summary */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Entrées (Pay-in)</span>
                  <span className="font-black text-emerald-600">+{activePayIn.toLocaleString()} FCFA</span>
                </div>
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Sorties (Pay-out)</span>
                  <span className="font-black text-rose-500">-{activePayOut.toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Operations timeline */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Journal des Ajustements Manuels</h3>
                {activeShift.operations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune opération Pay-in ou Pay-out sur ce shift.</p>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto pr-1">
                    {activeShift.operations.map((op) => (
                      <div key={op.id} className="flex items-center justify-between py-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          {op.type === 'PAY_IN' ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <ArrowUpRight className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                              <ArrowDownRight className="w-4 h-4" />
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-gray-800">{op.note || '—'}</p>
                            <p className="text-[9px] text-gray-400 font-medium">
                              {new Date(op.createdAt).toLocaleTimeString('fr-FR')}
                            </p>
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

              {/* Close Button Container */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                  <HelpCircle className="w-4 h-4" />
                  <span>Prêt à fermer ? Comptez la caisse avant de clôturer.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCloseShiftOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Clôturer la caisse
                </button>
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
                  Pour commencer à encaisser des commandes sur Gourmet POS, veuillez renseigner le fond de caisse initial disponible dans le tiroir.
                </p>
              </div>

              <form onSubmit={handleOpenShift} className="max-w-sm mx-auto space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                    Fond de caisse initial (FCFA) *
                  </label>
                  <input
                    type="number"
                    value={startAmountInput}
                    onChange={(e) => setStartAmountInput(e.target.value)}
                    placeholder="Ex: 50,000 FCFA"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-gray-900"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/25 transition-all"
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
              <div className="space-y-4">
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Ajoutez ou retirez manuellement des espèces du tiroir (ex: apport fonds, retrait fournisseur, monnaie).
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPayInOutType('PAY_IN')
                      setIsPayInOutOpen(true)
                    }}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                  >
                    <span className="flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4" />
                      Ajout (Pay-In)
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPayInOutType('PAY_OUT')
                      setIsPayInOutOpen(true)
                    }}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-rose-700 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                  >
                    <span className="flex items-center gap-1.5">
                      <MinusCircle className="w-4 h-4" />
                      Retrait (Pay-Out)
                    </span>
                    <ArrowDownRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>Espèces Actuelles Attendues :</span>
                    <span className="text-gray-900 text-xs font-black">{expectedAmount.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 space-y-2">
                <Lock className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs font-medium leading-relaxed max-w-[200px] mx-auto">
                  Veuillez ouvrir la caisse pour effectuer des ajustements de caisse.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── HISTORIQUE DES ROTATIONS ─────────────────────────────── */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-orange-600" />
            Historique des rotations de caisse
          </h2>
          
          {history.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 active:scale-95 transition-all text-xs font-bold w-fit"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          )}
        </div>

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
                  <th className="py-3 px-4 text-right">Actions</th>
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
                        <span className="text-[9px] text-gray-400 block mt-0.5 font-bold uppercase tracking-wider">
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
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => printShiftReport(h)}
                          title="Imprimer le rapport"
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 active:scale-95 transition-all inline-flex items-center gap-1 font-bold text-[10px]"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimer</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────── */}
      {activeShift && (
        <>
          <PayInOutModal
            isOpen={isPayInOutOpen}
            onClose={() => setIsPayInOutOpen(false)}
            shiftId={activeShift.id}
            type={payInOutType}
            onSuccess={triggerSuccess}
            onError={triggerError}
            onRefresh={loadData}
          />
          <CloseShiftModal
            isOpen={isCloseShiftOpen}
            onClose={() => setIsCloseShiftOpen(false)}
            shift={activeShift}
            totalCashSales={totalCashSales}
            expectedAmount={expectedAmount}
            userId={userId}
            userName={userName}
            onSuccess={triggerSuccess}
            onError={triggerError}
            onRefresh={loadData}
          />
        </>
      )}
    </div>
  )
}
