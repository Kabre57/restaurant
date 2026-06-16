'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Gift, Phone, ArrowLeft, Coins, History, Calendar, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type Transaction = {
  id: string
  type: 'EARN' | 'REDEEM'
  points: number
  description: string
  createdAt: string
}

type Customer = {
  id: string
  phone: string
  nom: string | null
  email: string | null
  points: number
  transactions: Transaction[]
}

// Simple deterministic SVG Barcode generator for a phone number
function PhoneBarcodeSVG({ phone }: { phone: string }) {
  // Generate a mock but realistic-looking barcode pattern based on the phone number
  const digits = phone.replace(/\D/g, '') || '00000000'
  const barPattern: number[] = []

  // Add start guard
  barPattern.push(2, 1, 2)
  // Encode each digit as alternating bar widths
  for (let i = 0; i < digits.length; i++) {
    const val = parseInt(digits[i]) || 0
    // Alternating wide (2px) and narrow (1px) bars
    barPattern.push(val % 2 === 0 ? 2 : 1)
    barPattern.push(val % 3 === 0 ? 2 : 1)
    barPattern.push(val % 4 === 0 ? 1 : 2)
  }
  // Add stop guard
  barPattern.push(2, 1, 2)

  let currentX = 0
  const renderedBars = barPattern.map((width, idx) => {
    const isBlack = idx % 2 === 0
    const barWidth = width * 1.8
    const element = isBlack ? (
      <rect
        key={idx}
        x={currentX}
        y={0}
        width={barWidth}
        height={50}
        fill="currentColor"
      />
    ) : null
    currentX += barWidth
    return element
  })

  return (
    <div className="flex flex-col items-center space-y-2 bg-white p-4 rounded-xl shadow-inner border border-[#E5E7EB] dark:border-[#2e3440] dark:bg-[#0f1115]">
      <svg
        width="100%"
        height="50"
        viewBox={`0 0 ${currentX} 50`}
        preserveAspectRatio="none"
        className="text-[#171717] dark:text-[#eceff4] max-w-[280px]"
      >
        {renderedBars}
      </svg>
      <span className="text-[10px] font-mono tracking-[0.3em] font-bold text-[#495057] dark:text-[#adb5bd]">
        *{digits}*
      </span>
    </div>
  )
}

function LoyaltyCheckContent() {
  const searchParams = useSearchParams()
  const phoneParam = searchParams.get('phone') || ''

  const [phone, setPhone] = useState(phoneParam)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (phoneParam) {
      fetchCustomer(phoneParam)
    }
  }, [phoneParam])

  const fetchCustomer = async (searchPhone: string) => {
    if (!searchPhone.trim()) return
    setIsLoading(true)
    setErrorMsg('')
    setCustomer(null)

    try {
      const res = await fetch(`/api/loyalty/customer?phone=${encodeURIComponent(searchPhone.trim())}`)
      const data = await res.json()
      if (res.status === 404) {
        setErrorMsg('Aucun compte fidélité trouvé pour ce numéro de téléphone.')
      } else if (!data.success) {
        setErrorMsg(data.error || 'Erreur lors de la récupération des données')
      } else {
        setCustomer(data.customer)
      }
    } catch (err) {
      setErrorMsg('Erreur de connexion réseau')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCustomer(phone)
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0f1115] text-[#171717] dark:text-[#eceff4] py-12 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6D00]/10 text-[#FF6D00] shadow-md">
            <Gift className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight">Progi-teck POS</h1>
          <p className="text-xs font-semibold text-[#868e96] dark:text-white/40 uppercase tracking-widest">
            Fidélité & Récompenses
          </p>
        </div>

        {/* Form to query */}
        {!customer && (
          <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-6 shadow-xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-black uppercase text-[#171717] dark:text-white">Consulter mes points</h2>
              <p className="text-[11px] font-semibold text-[#868e96] dark:text-white/40 uppercase">
                Saisissez votre numéro de téléphone pour afficher votre carte.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-[#fff5f5] dark:bg-[#3b1c1c] border-l-4 border-[#e03131] p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#e03131] shrink-0" />
                <p className="text-[11px] font-bold text-[#c92a2a] dark:text-red-200">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#adb5bd]" />
                <input
                  type="text"
                  required
                  placeholder="Ex: 07070707..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#FF6D00] hover:bg-[#e65c00] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? 'Recherche en cours...' : 'Se connecter'}
              </button>
            </form>
          </div>
        )}

        {/* Loyalty Card and details */}
        {customer && (
          <div className="space-y-8 animate-fade-in">
            {/* The Digital Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e222b] to-[#111317] border border-[#2e3440] p-6 text-white shadow-2xl space-y-6">
              {/* Decorative gradient overlay */}
              <div className="absolute -top-12 -right-12 h-32 w-32 bg-[#FF6D00]/20 rounded-full blur-2xl" />

              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#FF6D00]">
                    Carte Privilège
                  </span>
                  <h3 className="text-base font-black uppercase tracking-tight">
                    {customer.nom || 'Client Privilège'}
                  </h3>
                  <p className="text-[10px] font-mono text-white/50">{customer.phone}</p>
                </div>
                <div className="parabellum-gradient flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg text-white">
                  <Gift className="h-5 w-5" />
                </div>
              </div>

              {/* Barcode representation */}
              <PhoneBarcodeSVG phone={customer.phone} />

              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-white/40">
                    Propulsé par
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">
                    Progi-teck POS
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-[#FF6D00]">
                    Solde Points
                  </span>
                  <span className="text-2xl font-black text-[#FF6D00]">{customer.points}</span>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique des Points
              </h3>

              {customer.transactions && customer.transactions.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {customer.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-[#F8F9FA] dark:bg-[#0f1115]/40 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#171717] dark:text-white">
                          {tx.description}
                        </p>
                        <p className="text-[9px] font-bold text-[#adb5bd] flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" /> {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-black ${
                          tx.type === 'EARN' ? 'text-[#2f9e44]' : 'text-[#e03131]'
                        }`}
                      >
                        {tx.type === 'EARN' ? '+' : ''}
                        {tx.points}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-[#868e96] dark:text-white/40 uppercase text-center py-4">
                  Aucune transaction enregistrée.
                </p>
              )}
            </div>

            {/* Back Button */}
            <button
              onClick={() => setCustomer(null)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#868e96] hover:text-[#171717] dark:hover:text-white transition-all py-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Consulter un autre compte
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoyaltyCheckPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0f1115] flex items-center justify-center text-xs font-black uppercase text-[#868e96]">
        Chargement...
      </div>
    }>
      <LoyaltyCheckContent />
    </Suspense>
  )
}
