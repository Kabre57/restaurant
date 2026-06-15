'use client'

import React, { useState } from 'react'
import type { PaymentCustomer } from '../../lib/payment-types'
import { UserPlus, X } from 'lucide-react'

type PaymentCustomerSectionProps = {
  selectedCustomer: PaymentCustomer | null
  customerResults: PaymentCustomer[]
  onCustomerSearch: (query: string) => void
  onSelectCustomer: (customer: PaymentCustomer | null) => void
  loyaltyPointsRedeemed?: number
  onLoyaltyPointsRedeemedChange?: (points: number) => void
  loyaltyDiscount?: number
}

export function PaymentCustomerSection({
  selectedCustomer,
  customerResults,
  onCustomerSearch,
  onSelectCustomer,
  loyaltyPointsRedeemed = 0,
  onLoyaltyPointsRedeemedChange,
  loyaltyDiscount = 0,
}: PaymentCustomerSectionProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/loyalty/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newPhone.trim(),
          nom: newNom.trim(),
          email: newEmail.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création')
      } else {
        // Map LoyaltyCustomer to PaymentCustomer
        const createdCustomer: PaymentCustomer = {
          id: data.customer.id,
          firstName: data.customer.nom || 'Client',
          lastName: 'Fidélité',
          phone: data.customer.phone,
          loyalty: {
            points: data.customer.points,
          },
        }
        onSelectCustomer(createdCustomer)
        setIsCreating(false)
        setNewNom('')
        setNewPhone('')
        setNewEmail('')
      }
    } catch (err) {
      setError('Erreur réseau / serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#adb5bd]">Client & Fidélité</h4>
        {!selectedCustomer && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 text-[9px] font-black text-[#2f9e44] uppercase hover:underline"
          >
            <UserPlus className="w-3 h-3" />
            Nouveau Client
          </button>
        )}
      </div>

      {selectedCustomer ? (
        <div className="space-y-2">
          <div className="bg-white p-4 rounded-2xl border-2 border-[#2f9e44] flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-black text-[#212529] uppercase">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </p>
              <p className="text-[9px] font-bold text-[#adb5bd] uppercase">
                {selectedCustomer.loyalty?.points || 0} Points disponibles
              </p>
            </div>
            <button
              onClick={() => {
                if (onLoyaltyPointsRedeemedChange) onLoyaltyPointsRedeemedChange(0)
                onSelectCustomer(null)
              }}
              className="text-[9px] font-black text-[#e03131] uppercase hover:underline"
            >
              Retirer
            </button>
          </div>

          {selectedCustomer.loyalty && selectedCustomer.loyalty.points > 0 && onLoyaltyPointsRedeemedChange && (
            <div className="bg-white p-4 rounded-2xl border border-[#e9ecef] space-y-2 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-[#495057] uppercase tracking-wider">Racheter des points</span>
                <span className="text-[10px] font-black text-[#2f9e44]">- {loyaltyDiscount} FCFA</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={selectedCustomer.loyalty.points}
                  value={loyaltyPointsRedeemed || ''}
                  onChange={(e) => {
                    const val = Math.min(
                      selectedCustomer.loyalty!.points,
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                    onLoyaltyPointsRedeemedChange(val)
                  }}
                  placeholder="Ex: 100"
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#2f9e44]"
                />
                <button
                  onClick={() => onLoyaltyPointsRedeemedChange(selectedCustomer.loyalty!.points)}
                  className="px-3 py-2 bg-[#2f9e44] text-white text-[9px] font-black rounded-lg uppercase whitespace-nowrap hover:bg-[#2b8a3e] transition-all"
                >
                  Tout utiliser
                </button>
              </div>
              <p className="text-[8px] font-bold text-[#adb5bd] uppercase">
                Taux : 1 Point = 10 FCFA
              </p>
            </div>
          )}
        </div>
      ) : isCreating ? (
        <form onSubmit={handleCreateCustomer} className="bg-white p-4 rounded-2xl border border-[#e9ecef] space-y-3 shadow-sm">
          <div className="flex justify-between items-center border-b border-[#f1f3f5] pb-2 mb-2">
            <span className="text-[9px] font-black text-[#495057] uppercase tracking-wider">Créer Client Fidélité</span>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setError('')
              }}
              className="text-[#adb5bd] hover:text-[#212529]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && <p className="text-[9px] font-bold text-[#e03131] uppercase">{error}</p>}

          <div className="space-y-2">
            <div>
              <label className="text-[8px] font-black text-[#adb5bd] uppercase block mb-1">Nom Complet</label>
              <input
                type="text"
                required
                value={newNom}
                onChange={(e) => setNewNom(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#2f9e44]"
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-[#adb5bd] uppercase block mb-1">Téléphone</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ex: +2250707070707"
                className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#2f9e44]"
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-[#adb5bd] uppercase block mb-1">Email (Optionnel)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Ex: jean.dupont@email.com"
                className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#2f9e44]"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setError('')
              }}
              className="w-1/2 py-2 border border-[#e9ecef] text-[#495057] text-[9px] font-black rounded-lg uppercase hover:bg-[#f8f9fa] transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2 bg-[#2f9e44] text-white text-[9px] font-black rounded-lg uppercase hover:bg-[#2b8a3e] transition-all disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      ) : (
        <div className="relative">
          <input
            type="text"
            placeholder="RECHERCHER UN CLIENT (TÉLÉPHONE...)"
            className="w-full bg-white border border-[#e9ecef] rounded-xl px-4 py-3 text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all uppercase"
            onChange={(event) => onCustomerSearch(event.target.value)}
          />

          {customerResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-[#e9ecef] rounded-xl mt-2 shadow-2xl z-20 overflow-hidden">
              {customerResults.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="w-full text-left p-3 hover:bg-[#f8f9fa] border-b border-[#f1f3f5] last:border-0"
                >
                  <p className="text-[10px] font-black text-[#212529] uppercase">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-[8px] font-bold text-[#adb5bd]">{customer.phone}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
