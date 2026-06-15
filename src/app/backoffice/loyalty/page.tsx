'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RestaurateurLayout from '@/app/restaurateur/layout'
import {
  Gift,
  Search,
  Plus,
  UserPlus,
  Coins,
  History,
  Info,
  Check,
  Trash2,
  Calendar,
  Phone,
  User,
  Mail,
  AlertTriangle
} from 'lucide-react'

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

type Reward = {
  id: string
  code: string
  label: string
  description: string | null
  pointsCost: number
  isActive: boolean
}

export default function LoyaltyBackofficePage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'CASHIER'
  const isManagerOrAdmin = ['ADMIN', 'RESTAURATEUR'].includes(userRole)

  const [phoneSearch, setPhoneSearch] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [isLoadingRewards, setIsLoadingRewards] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Create Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustNom, setNewCustNom] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')

  // Create Reward Modal
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [newRewCode, setNewRewCode] = useState('')
  const [newRewLabel, setNewRewLabel] = useState('')
  const [newRewDesc, setNewRewDesc] = useState('')
  const [newRewCost, setNewRewCost] = useState<number>(50)

  useEffect(() => {
    fetchRewards()
  }, [])

  const fetchRewards = async () => {
    setIsLoadingRewards(true)
    try {
      const res = await fetch('/api/loyalty/rewards')
      const data = await res.json()
      if (data.success) {
        setRewards(data.rewards)
      }
    } catch (err) {
      console.error('Failed to fetch rewards', err)
    } finally {
      setIsLoadingRewards(false)
    }
  }

  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneSearch.trim()) return

    setIsLoadingCustomer(true)
    setErrorMsg('')
    setCustomer(null)

    try {
      const res = await fetch(`/api/loyalty/customer?phone=${encodeURIComponent(phoneSearch.trim())}`)
      const data = await res.json()
      if (res.status === 404) {
        setErrorMsg('Client introuvable. Vous pouvez le créer ci-dessous.')
      } else if (!data.success) {
        setErrorMsg(data.error || 'Une erreur est survenue')
      } else {
        setCustomer(data.customer)
      }
    } catch (err) {
      setErrorMsg('Erreur lors de la recherche du client')
    } finally {
      setIsLoadingCustomer(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/loyalty/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newCustPhone,
          nom: newCustNom || null,
          email: newCustEmail || null,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setErrorMsg(data.error || 'Erreur lors de la création du client')
      } else {
        setSuccessMsg('Client créé avec succès !')
        setCustomer({ ...data.customer, transactions: [] })
        setPhoneSearch(newCustPhone)
        setIsCustomerModalOpen(false)
        // Reset form
        setNewCustPhone('')
        setNewCustNom('')
        setNewCustEmail('')
      }
    } catch (err) {
      setErrorMsg('Erreur de connexion serveur')
    }
  }

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newRewCode,
          label: newRewLabel,
          description: newRewDesc || null,
          pointsCost: newRewCost,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setErrorMsg(data.error || 'Erreur lors de la création de la récompense')
      } else {
        setSuccessMsg('Récompense créée avec succès !')
        setIsRewardModalOpen(false)
        fetchRewards()
        // Reset form
        setNewRewCode('')
        setNewRewLabel('')
        setNewRewDesc('')
        setNewRewCost(50)
      }
    } catch (err) {
      setErrorMsg('Erreur de connexion serveur')
    }
  }

  const handleDeleteReward = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cette récompense ?')) return
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await fetch(`/api/loyalty/rewards?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) {
        setErrorMsg(data.error || 'Erreur lors de la désactivation')
      } else {
        setSuccessMsg('Récompense désactivée avec succès.')
        fetchRewards()
      }
    } catch (err) {
      setErrorMsg('Erreur de connexion')
    }
  }

  return (
    <RestaurateurLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header / Title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#171717] dark:text-white flex items-center gap-2">
              <Gift className="h-6 w-6 text-[#FF6D00]" />
              Gestion du Programme Fidélité
            </h1>
            <p className="text-xs font-semibold text-[#868e96] dark:text-white/40 uppercase tracking-wider mt-1">
              Consultez le solde de vos clients et administrez les offres de récompenses.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#212529] hover:bg-[#343a40] text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              Nouveau Client
            </button>
            {isManagerOrAdmin && (
              <button
                onClick={() => setIsRewardModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6D00] hover:bg-[#e65c00] text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all shadow-md"
              >
                <Plus className="h-4 w-4" />
                Ajouter une Récompense
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-[#fff5f5] dark:bg-[#3b1c1c] border-l-4 border-[#e03131] p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#e03131] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-[#e03131] uppercase">Erreur</p>
              <p className="text-xs font-semibold text-[#c92a2a] dark:text-red-200 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-[#ebfbee] dark:bg-[#1c3b24] border-l-4 border-[#2f9e44] p-4 rounded-xl flex items-start gap-3">
            <Check className="h-5 w-5 text-[#2f9e44] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-[#2f9e44] uppercase">Succès</p>
              <p className="text-xs font-semibold text-[#2b8a3e] dark:text-green-200 mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2: Search & Client Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Search Box */}
            <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] mb-4">Rechercher un Client</h3>
              <form onSubmit={handleSearchCustomer} className="flex gap-3">
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#adb5bd]" />
                  <input
                    type="text"
                    placeholder="Entrez le numéro de téléphone (ex: 0707...)"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingCustomer}
                  className="flex items-center gap-2 px-6 py-3 bg-[#FF6D00] hover:bg-[#e65c00] text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  Rechercher
                </button>
              </form>
            </div>

            {/* Client Fiche */}
            {customer ? (
              <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-8 shadow-sm space-y-8">
                {/* Profile Overview */}
                <div className="flex justify-between items-start border-b border-[#F0F1F6] dark:border-[#2e3440] pb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-2xl bg-[#FF6D00]/10 flex items-center justify-center text-[#FF6D00]">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-[#171717] dark:text-white uppercase">
                          {customer.nom || 'Client Anonyme'}
                        </h2>
                        <p className="text-[10px] font-bold text-[#adb5bd] tracking-wider uppercase flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {customer.phone}
                        </p>
                      </div>
                    </div>
                    {customer.email && (
                      <p className="text-xs font-semibold text-[#868e96] dark:text-white/50 flex items-center gap-1 pl-12">
                        <Mail className="h-3 w-3" /> {customer.email}
                      </p>
                    )}
                  </div>

                  <div className="bg-[#FF6D00]/10 border border-[#FF6D00]/30 rounded-2xl p-4 text-center min-w-[120px]">
                    <span className="block text-[8px] font-black text-[#FF6D00] uppercase tracking-[0.2em] mb-1">
                      Solde Fidélité
                    </span>
                    <span className="text-2xl font-black text-[#FF6D00]">{customer.points}</span>
                    <span className="block text-[8px] font-bold text-[#868e96] dark:text-white/40 uppercase mt-0.5">
                      Points
                    </span>
                  </div>
                </div>

                {/* Transactions History */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historique des Transactions (50 dernières)
                  </h3>

                  {customer.transactions && customer.transactions.length > 0 ? (
                    <div className="border border-[#E5E7EB] dark:border-[#2e3440] rounded-2xl overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#2e3440]">
                      {customer.transactions.map((tx) => (
                        <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-[#F8F9FA] dark:hover:bg-[#1f232b]/30 transition-all">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-[#171717] dark:text-white">
                              {tx.description}
                            </p>
                            <p className="text-[9px] font-bold text-[#adb5bd] flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              tx.type === 'EARN'
                                ? 'bg-[#ebfbee] text-[#2f9e44]'
                                : 'bg-[#fff0f6] text-[#e03131]'
                            }`}
                          >
                            {tx.type === 'EARN' ? '+' : ''}{tx.points} PTS
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-[#E5E7EB] dark:border-[#2e3440] rounded-2xl">
                      <p className="text-xs font-semibold text-[#868e96] dark:text-white/40 uppercase">
                        Aucune transaction enregistrée pour ce client.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-12 text-center shadow-sm space-y-4">
                <div className="h-16 w-16 rounded-full bg-[#F8F9FA] dark:bg-[#0f1115] flex items-center justify-center mx-auto text-[#adb5bd]">
                  <Info className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-[#171717] dark:text-white">Aucun client sélectionné</h3>
                  <p className="text-xs font-semibold text-[#868e96] dark:text-white/40 uppercase mt-1">
                    Recherchez un numéro de téléphone pour afficher sa fiche fidélité.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Rewards List */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb5bd] mb-4 flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Offres & Récompenses
              </h3>

              {isLoadingRewards ? (
                <p className="text-xs font-semibold text-[#adb5bd] uppercase text-center py-4">Chargement...</p>
              ) : rewards.length > 0 ? (
                <div className="space-y-4">
                  {rewards.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#2e3440] bg-[#F8F9FA] dark:bg-[#0f1115]/40 flex justify-between items-center group hover:shadow-md transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#171717] dark:text-white uppercase">{r.label}</span>
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-[#FF6D00]/10 text-[#FF6D00] rounded uppercase tracking-wider">
                            {r.code}
                          </span>
                        </div>
                        {r.description && (
                          <p className="text-[10px] font-medium text-[#868e96] dark:text-white/50">{r.description}</p>
                        )}
                        <span className="inline-block text-[10px] font-black text-[#FF6D00] uppercase tracking-wider">
                          {r.pointsCost} Points
                        </span>
                      </div>

                      {isManagerOrAdmin && (
                        <button
                          onClick={() => handleDeleteReward(r.id)}
                          className="p-2 text-[#adb5bd] hover:text-[#e03131] hover:bg-[#fff5f5] dark:hover:bg-red-950/20 rounded-xl transition-all"
                          title="Désactiver l'offre"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-[#adb5bd] uppercase text-center py-4">Aucune récompense active.</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Create Customer */}
        {isCustomerModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-6 w-full max-w-md shadow-2xl relative">
              <h3 className="text-sm font-black uppercase text-[#171717] dark:text-white mb-6">
                Créer un Client Fidélité
              </h3>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Téléphone (Requis)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="Ex: 07070707"
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Nom (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={newCustNom}
                    onChange={(e) => setNewCustNom(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Email (Optionnel)
                  </label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="Ex: jean@example.com"
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div className="flex gap-3 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold uppercase text-[#868e96] hover:bg-[#F8F9FA] rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#FF6D00] hover:bg-[#e65c00] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
                  >
                    Créer le compte
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Reward */}
        {isRewardModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#181a20] rounded-3xl border border-[#E5E7EB] dark:border-[#2e3440] p-6 w-full max-w-md shadow-2xl relative">
              <h3 className="text-sm font-black uppercase text-[#171717] dark:text-white mb-6">
                Créer une Récompense
              </h3>
              <form onSubmit={handleCreateReward} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Code (Unique, ex: RWD_DESSERT)
                  </label>
                  <input
                    type="text"
                    required
                    value={newRewCode}
                    onChange={(e) => setNewRewCode(e.target.value.toUpperCase())}
                    placeholder="RWD_DESSERT"
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Libellé de la Récompense
                  </label>
                  <input
                    type="text"
                    required
                    value={newRewLabel}
                    onChange={(e) => setNewRewLabel(e.target.value)}
                    placeholder="Ex: Dessert au Choix Offert"
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Coût en Points
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newRewCost}
                    onChange={(e) => setNewRewCost(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#adb5bd] mb-1">
                    Description (Optionnelle)
                  </label>
                  <textarea
                    value={newRewDesc}
                    onChange={(e) => setNewRewDesc(e.target.value)}
                    placeholder="Description de l'offre..."
                    rows={3}
                    className="w-full bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]"
                  />
                </div>

                <div className="flex gap-3 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsRewardModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold uppercase text-[#868e96] hover:bg-[#F8F9FA] rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#FF6D00] hover:bg-[#e65c00] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
                  >
                    Créer la récompense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RestaurateurLayout>
  )
}
