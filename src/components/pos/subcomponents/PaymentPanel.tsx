// src/components/pos/subcomponents/PaymentPanel.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { CreditCard, DollarSign, Wallet, Check, Search, Tag, Trash2, X, RefreshCw } from 'lucide-react'

export type PaymentMethod = 'ESPECES' | 'CARTE' | 'MOBILE'

interface PaymentPanelProps {
  total: number
  onFinalize: (method: PaymentMethod, amountReceived: number, changeAmount: number) => void
  onClose?: () => void
  isProcessing?: boolean
}

// Couleurs et styles des billets réels de l'Afrique de l'Ouest (FCFA - BCEAO)
const BILL_DEFINITIONS = [
  { value: 500, label: '500', color: 'from-[#8D5B4C] to-[#6E4236]', textColor: 'text-[#ffd8a8]', bgLight: 'bg-[#8D5B4C]/10' },
  { value: 1000, label: '1 000', color: 'from-[#C93B2B] to-[#992215]', textColor: 'text-[#ffc9c9]', bgLight: 'bg-[#C93B2B]/10' },
  { value: 2000, label: '2 000', color: 'from-[#5F3EA1] to-[#42257A]', textColor: 'text-[#eebefa]', bgLight: 'bg-[#5F3EA1]/10' },
  { value: 5000, label: '5 000', color: 'from-[#1E8A5F] to-[#125A3C]', textColor: 'text-[#b2f2bb]', bgLight: 'bg-[#1E8A5F]/10' },
  { value: 10000, label: '10 000', color: 'from-[#2B6CB0] to-[#1A446C]', textColor: 'text-[#bee3f8]', bgLight: 'bg-[#2B6CB0]/10' },
]

function createBillSelectionId(value: number) {
  return `${value}-${Date.now()}-${Math.random()}`
}

export function PaymentPanel({
  total,
  onFinalize,
  onClose,
  isProcessing = false,
}: PaymentPanelProps) {
  const [method, setMethod] = useState<PaymentMethod>('ESPECES')
  const [selectedBills, setSelectedBills] = useState<{ id: string; value: number }[]>([])
  const [manualAmount, setManualAmount] = useState<string>('')
  
  // Section Promo & Client locale interactive pour le POS
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; phone: string } | null>(null)
  const [showCustomerInput, setShowCustomerInput] = useState(false)

  // Calcul du montant reçu
  const amountFromBills = useMemo(() => {
    return selectedBills.reduce((sum, bill) => sum + bill.value, 0)
  }, [selectedBills])

  const amountReceived = useMemo(() => {
    if (manualAmount && parseInt(manualAmount) > 0) {
      return parseInt(manualAmount)
    }
    return amountFromBills
  }, [amountFromBills, manualAmount])

  // Calculs financiers
  const netTotal = Math.max(0, total - discount)
  const changeAmount = Math.max(0, amountReceived - netTotal)
  const isPaymentValid = amountReceived >= netTotal

  // Ajout de billet
  const handleAddBill = (value: number) => {
    if (manualAmount) setManualAmount('') // réinitialise le mode manuel si on clique sur un billet
    const newBill = {
      id: createBillSelectionId(value),
      value,
    }
    setSelectedBills((prev) => [...prev, newBill])
  }

  // Suppression d'un billet spécifique
  const handleRemoveBill = (id: string) => {
    setSelectedBills((prev) => prev.filter((bill) => bill.id !== id))
  }

  // Tout réinitialiser / Annuler
  const handleClear = () => {
    setSelectedBills([])
    setManualAmount('')
  }

  // Appliquer le code promo
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return

    if (code === 'BIENVENUE' || code === 'PARABELLUM' || code === 'SOLDE') {
      const computedDiscount = Math.round(total * 0.1) // 10% de remise
      setDiscount(computedDiscount)
      setAppliedPromo(code)
    } else {
      alert('Code promotionnel invalide ! Essayez "BIENVENUE" ou "PARABELLUM".')
    }
  }

  const handleRemovePromo = () => {
    setDiscount(0)
    setAppliedPromo(null)
    setPromoCode('')
  }

  const handleSelectCustomerFake = () => {
    if (customerQuery.trim()) {
      setSelectedCustomer({
        name: customerQuery.trim(),
        phone: '+225 ' + Math.floor(100000000 + Math.random() * 900000000),
      })
      setCustomerQuery('')
      setShowCustomerInput(false)
    }
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-[2.5rem] border border-[#ebeef2] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
      {/* 💳 PANNEAU DE GAUCHE : Résumés, Clients, Codes Promos */}
      <div className="flex-1 p-8 bg-[#f8f9fa] border-r border-[#e9ecef] flex flex-col justify-between space-y-6">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">POS Écran</span>
              <h2 className="text-2xl font-black tracking-tight text-[#212529]">MODE DE PAIEMENT</h2>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-white border border-[#e9ecef] flex items-center justify-center text-[#868e96] hover:text-[#212529] hover:shadow-sm active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Sélecteur de mode de paiement tactile et premium */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {(['ESPECES', 'CARTE', 'MOBILE'] as PaymentMethod[]).map((m) => {
              const icons = {
                ESPECES: <DollarSign className="w-5 h-5" />,
                CARTE: <CreditCard className="w-5 h-5" />,
                MOBILE: <Wallet className="w-5 h-5" />,
              }
              const labels = {
                ESPECES: 'Espèces',
                CARTE: 'Carte',
                MOBILE: 'Mobile',
              }
              const active = method === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m)
                    if (m !== 'ESPECES') handleClear() // vide les billets si on passe en carte
                  }}
                  className={`h-16 flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border active:scale-95 ${
                    active
                      ? 'bg-[#FF6D00] border-transparent text-white shadow-lg shadow-orange-500/20'
                      : 'bg-white border-[#e9ecef] text-[#868e96] hover:text-[#212529] hover:border-[#ced4da]'
                  }`}
                >
                  {icons[m]}
                  <span>{labels[m]}</span>
                </button>
              )
            })}
          </div>

          {/* Section Récapitulatif financier */}
          <div className="bg-white rounded-2xl border border-[#e9ecef] p-5 space-y-3 shadow-sm mb-6">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-[#868e96]">
              <span>Sous-total</span>
              <span className="font-extrabold text-[#212529]">{total.toLocaleString()} FCFA</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-[#e03131]">
                <span>Remise promotionnelle</span>
                <span className="font-extrabold">-{discount.toLocaleString()} FCFA</span>
              </div>
            )}
            <div className="pt-3 border-t border-dashed border-[#e9ecef] flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#212529]">TOTAL NET</span>
              <span className="text-2xl font-black tracking-tight text-[#FF6D00]">{netTotal.toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* 👥 CLIENT & FIDÉLITÉ */}
          <div className="space-y-3 mb-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Client & Fidélité</h4>
            {selectedCustomer ? (
              <div className="bg-white rounded-2xl border border-emerald-100 bg-emerald-50/20 p-4 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-black text-[#1b4332] uppercase">{selectedCustomer.name}</p>
                  <p className="text-[9px] font-bold text-emerald-600 mt-0.5">{selectedCustomer.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest"
                >
                  Retirer
                </button>
              </div>
            ) : showCustomerInput ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Nom du client..."
                    className="w-full h-12 bg-white border border-[#ced4da] rounded-xl px-4 text-xs font-bold text-[#495057] focus:outline-none focus:border-[#FF6D00] pr-10"
                  />
                  <Search className="w-4 h-4 text-[#adb5bd] absolute right-3 top-4" />
                </div>
                <button
                  type="button"
                  onClick={handleSelectCustomerFake}
                  className="h-12 px-4 rounded-xl bg-[#212529] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerInput(false)}
                  className="h-12 w-12 rounded-xl border border-[#dee2e6] hover:bg-[#e9ecef] flex items-center justify-center text-[#868e96]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomerInput(true)}
                className="w-full h-12 rounded-xl border border-dashed border-[#dee2e6] hover:border-[#ced4da] hover:bg-white/80 transition-all flex items-center justify-center gap-2 text-xs font-bold text-[#868e96]"
              >
                <Search className="w-4 h-4" />
                Rechercher ou créer un client
              </button>
            )}
          </div>

          {/* 🏷️ PROMOTION */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Promotion</h4>
            {appliedPromo ? (
              <div className="bg-white rounded-2xl border border-[#ffc078] bg-[#fff9db]/20 p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#f08c00]" />
                  <div>
                    <p className="text-xs font-black text-[#862e01] uppercase">CODE APPLIQUÉ: {appliedPromo}</p>
                    <p className="text-[9px] font-bold text-[#f08c00] mt-0.5">-10% de réduction immédiate</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-[#e03131] hover:text-[#c92a2a] p-1.5 rounded-lg hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="CODE PROMO (ex: BIENVENUE)"
                  className="flex-1 h-12 bg-white border border-[#ced4da] rounded-xl px-4 text-xs font-bold text-[#495057] focus:outline-none focus:border-[#FF6D00] uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="h-12 px-6 rounded-xl bg-[#212529] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Appliquer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Boutons d'Action Principaux */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e9ecef]">
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl border border-[#dee2e6] hover:bg-[#fff5f5] hover:text-[#e03131] hover:border-[#ffc9c9] text-xs font-black uppercase tracking-widest text-[#495057] active:scale-95 transition-all"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            disabled={isProcessing || !isPaymentValid}
            onClick={() => onFinalize(method, amountReceived, changeAmount)}
            className={`h-14 rounded-2xl text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${
              isPaymentValid
                ? 'bg-[#2b8a3e] hover:bg-[#237032] shadow-emerald-500/10'
                : 'bg-[#adb5bd] cursor-not-allowed shadow-none'
            }`}
          >
            {isProcessing ? 'Traitement...' : 'Valider'}
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 💵 PANNEAU DE DROITE : Saisie tactile des billets BCEAO */}
      <div className="flex-1 p-8 flex flex-col justify-between space-y-6">
        <div>
          {/* Montant Reçu avec saisie manuelle intégrée */}
          <div className="bg-[#212529] rounded-[2rem] p-6 shadow-xl relative overflow-hidden mb-6">
            {/* Décoration en arrière-plan */}
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Montant Reçu</span>
              
              {/* Entrée manuelle via un petit champ input */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-[9px] font-bold text-white/60">Clavier:</span>
                <input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => {
                    setManualAmount(e.target.value)
                    setSelectedBills([]) // vide la pile si on tape à la main
                  }}
                  placeholder="Saisie manuelle"
                  className="bg-transparent text-white font-extrabold text-xs w-24 text-right focus:outline-none placeholder-white/35 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[9px] font-bold text-white/40">F</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <div className="text-4xl font-black text-white tracking-tight">
                {amountReceived.toLocaleString()} <span className="text-lg opacity-50">FCFA</span>
              </div>
              
              {/* Indicateur de validité */}
              {isPaymentValid ? (
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  Payé
                </span>
              ) : (
                <span className="text-[9px] font-black text-[#ff922b] uppercase tracking-widest bg-[#ff922b]/10 px-2.5 py-1 rounded-md border border-[#ff922b]/20 animate-pulse">
                  Requis
                </span>
              )}
            </div>
          </div>

          {/* Grille de billets standardisés BCEAO */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Billets disponibles</h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BILL_DEFINITIONS.map((bill) => (
                <button
                  key={bill.value}
                  type="button"
                  disabled={method !== 'ESPECES'}
                  onClick={() => handleAddBill(bill.value)}
                  className={`h-20 rounded-[1.25rem] bg-gradient-to-br ${bill.color} ${bill.textColor} p-3.5 relative overflow-hidden transition-all duration-200 active:scale-95 shadow-md flex flex-col justify-between text-left hover:brightness-105 group disabled:opacity-40 disabled:pointer-events-none`}
                >
                  {/* Filigrane discret du logo de la banque */}
                  <div className="absolute right-2 top-2 text-[10px] opacity-15 font-black uppercase tracking-widest select-none pointer-events-none group-hover:scale-110 transition-transform">
                    BCEAO
                  </div>
                  
                  {/* Valeur textuelle en gros */}
                  <span className="text-xs font-black uppercase tracking-widest opacity-75">Billet</span>
                  <span className="text-xl font-black tracking-tighter leading-none mt-1">
                    {bill.label}
                  </span>
                  
                  {/* Mention FCFA en bas à droite */}
                  <div className="absolute bottom-3 right-3 text-[9px] font-black tracking-widest opacity-60">
                    FCFA
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 📚 Liste des billets ajoutés (UX stack) & Rendu monnaie */}
        <div className="space-y-4">
          {/* Liste dynamique des billets déposés sous forme de badges supprimables au clic */}
          {selectedBills.length > 0 && (
            <div className="space-y-2 animate-in slide-in-from-bottom duration-300">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Pile de billets déposés :</span>
              <div className="flex flex-wrap gap-2 max-h-[85px] overflow-y-auto no-scrollbar py-1">
                {selectedBills.map((bill) => {
                  const def = BILL_DEFINITIONS.find((b) => b.value === bill.value)
                  return (
                    <button
                      key={bill.id}
                      type="button"
                      onClick={() => handleRemoveBill(bill.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black ${def?.bgLight || 'bg-[#f1f3f5]'} transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-95 shadow-sm group`}
                      title="Cliquez pour retirer ce billet"
                    >
                      <span>{bill.value.toLocaleString()} FCFA</span>
                      <X className="w-3.5 h-3.5 stroke-[3px] text-[#adb5bd] group-hover:text-rose-500" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rendu Monnaie */}
          <div className="bg-[#f8f9fa] rounded-2xl border border-[#e9ecef] p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-black text-[#868e96] uppercase tracking-[0.2em]">Monnaie à Rendre</span>
              <p className="text-2xl font-black text-[#2b8a3e] tracking-tight mt-1">
                {changeAmount.toLocaleString()} <span className="text-xs">FCFA</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-[#2b8a3e]">
              <RefreshCw className="w-6 h-6 animate-in spin-in-12 duration-1000" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
