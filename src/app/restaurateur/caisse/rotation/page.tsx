'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { Coins, Lock, Unlock } from 'lucide-react'

import PayInOutModal from '@/components/restaurateur/PayInOutModal'
import CloseShiftModal from '@/components/restaurateur/CloseShiftModal'

import { useCashierShift } from './hooks/useCashierShift'
import { printShiftReport } from './lib/printShiftReport'
import { ActiveSessionCard } from './components/ActiveSessionCard'
import { QuickAdjustments } from './components/QuickAdjustments'
import { ShiftHistoryTable } from './components/ShiftHistoryTable'

export default function CashDrawerRotationPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId
  const userId = session?.user?.id || 'cashier_id'
  const userName = session?.user?.name || 'Caissier'

  const {
    isLoading,
    activeShift,
    totalCashSales,
    expectedAmount,
    history,
    startAmountInput,
    setStartAmountInput,
    isPayInOutOpen,
    setIsPayInOutOpen,
    payInOutType,
    setPayInOutType,
    isCloseShiftOpen,
    setIsCloseShiftOpen,
    errorMsg,
    successMsg,
    triggerSuccess,
    triggerError,
    loadData,
    handleOpenShift,
    exportToCSV
  } = useCashierShift({ storeId, userId, userName })

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
            <ActiveSessionCard
              activeShift={activeShift}
              totalCashSales={totalCashSales}
              expectedAmount={expectedAmount}
              activePayIn={activePayIn}
              activePayOut={activePayOut}
              onPrintReport={() => printShiftReport(activeShift, activeShift.id, totalCashSales, triggerError)}
              onCloseShift={() => setIsCloseShiftOpen(true)}
            />
          ) : (
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
          <QuickAdjustments
            activeShift={activeShift}
            expectedAmount={expectedAmount}
            onTriggerAdjustment={(type) => {
              setPayInOutType(type)
              setIsPayInOutOpen(true)
            }}
          />
        </div>

      </div>

      {/* ── HISTORIQUE DES ROTATIONS ─────────────────────────────── */}
      <ShiftHistoryTable
        history={history}
        onExportCSV={exportToCSV}
        onPrintReport={(shift) => printShiftReport(shift, activeShift?.id, totalCashSales, triggerError)}
      />

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
