// src/app/backoffice/stores/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import RestaurateurLayout from "@/app/restaurateur/layout"
import {
  Building,
  Plus,
  TrendingUp,
  Package,
  Users,
  Search,
  MapPin,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Percent,
  Layers,
  ChevronRight,
  ShieldCheck,
  X,
  CheckCircle,
} from "lucide-react"
import { useToast } from "@/components/ui/Toast"

interface StoreSummary {
  id: string
  name: string
  code: string | null
  address: string | null
  commission: number
  parentName: string | null
  totalSales: number
  totalStock: number
  employeeCount: number
  productsCount: number
}

export default function FranchiseStoresPage() {
  const { data: session, status } = useSession()
  const toast = useToast()
  
  const userRole = session?.user?.role
  const isAuthorized = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "RESTAURATEUR" || userRole === "MANAGER"
  const canCreateStore = userRole === "ADMIN" || userRole === "SUPER_ADMIN"

  const [stores, setStores] = useState<StoreSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Create Store Form state
  const [newStore, setNewStore] = useState({
    name: "",
    code: "",
    timezone: "Africa/Abidjan",
    address: "",
    phone: "",
    email: "",
    commission: 15,
  })

  const loadStores = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stores/summary")
      if (!res.ok) {
        throw new Error("Erreur de récupération du résumé des établissements")
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        setStores(data)
      }
    } catch (err: any) {
      console.error(err)
      toast(err.message || "Erreur lors du chargement des magasins", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && isAuthorized) {
      loadStores()
    }
  }, [status, userRole])

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStore.name) {
      toast("Le nom de l'établissement est requis", "error")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStore),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur de création de l'établissement")
      }
      toast("Établissement créé avec succès !", "success")
      setShowCreateModal(false)
      // Reset form
      setNewStore({
        name: "",
        code: "",
        timezone: "Africa/Abidjan",
        address: "",
        phone: "",
        email: "",
        commission: 15,
      })
      loadStores()
    } catch (err: any) {
      console.error(err)
      toast(err.message || "Impossible de créer l'établissement", "error")
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "loading") {
    return (
      <RestaurateurLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#FF6D00] animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Chargement de la session...
          </p>
        </div>
      </RestaurateurLayout>
    )
  }

  if (!isAuthorized) {
    return (
      <RestaurateurLayout>
        <div className="max-w-md mx-auto my-20 p-6 bg-white dark:bg-[#181a20] rounded-3xl border border-rose-500/20 text-center space-y-4 shadow-sm">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black uppercase text-[#171717] dark:text-white">
            Accès Refusé
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            Vous devez posséder des privilèges de franchise ou de gestion centrale pour accéder à la console franchise.
          </p>
        </div>
      </RestaurateurLayout>
    )
  }

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (store.code && store.code.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Calculations for consolidated cards
  const totalCA = stores.reduce((sum, s) => sum + s.totalSales, 0)
  const totalStockQuantity = stores.reduce((sum, s) => sum + s.totalStock, 0)
  const totalEmployeesCount = stores.reduce((sum, s) => sum + s.employeeCount, 0)

  return (
    <RestaurateurLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">
              Hub Central
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#171717] dark:text-white mt-1">
              Console Franchise
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Pilotez l'ensemble de votre réseau d'établissements et gérez les ressources globales.
            </p>
          </div>
          {canCreateStore && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-[#FF6D00] text-white hover:bg-[#E05300] px-5 py-3 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#FF6D00]/20 hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Créer un Établissement
            </button>
          )}
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-6 -mt-6" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Établissements
              </span>
              <div className="h-9 w-9 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-[#171717] dark:text-white">
              {stores.length}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" /> Stores Actifs
            </p>
          </div>

          <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                CA Cumulé
              </span>
              <div className="h-9 w-9 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#171717] dark:text-white">
              {new Intl.NumberFormat("fr-FR").format(totalCA)} FCFA
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              Commandes Finalisées
            </p>
          </div>

          <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-6 -mt-6" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Volume Stock total
              </span>
              <div className="h-9 w-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-[#171717] dark:text-white">
              {new Intl.NumberFormat("fr-FR").format(totalStockQuantity)}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              Articles en stock
            </p>
          </div>

          <div className="bg-white dark:bg-[#181a20] rounded-3xl p-6 border border-[#E5E7EB] dark:border-[#2e3440] shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-6 -mt-6" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Ressources Humaines
              </span>
              <div className="h-9 w-9 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-[#171717] dark:text-white">
              {totalEmployeesCount}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              Collaborateurs affectés
            </p>
          </div>
        </div>

        {/* Search & Stores Table Section */}
        <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl shadow-sm overflow-hidden">
          {/* Header Actions */}
          <div className="p-6 border-b border-[#F0F1F6] dark:border-[#2e3440] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un établissement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none placeholder-[#adb5bd]"
              />
            </div>
            <span className="text-xs font-bold text-slate-400">
              {filteredStores.length} résultat{filteredStores.length !== 1 && "s"}
            </span>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-[#FF6D00] animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Chargement des établissements...
              </p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
              Aucun établissement ne correspond à votre recherche.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] dark:bg-[#181a20]/40 text-[#868e96] text-[10px] font-black uppercase tracking-wider border-b border-[#E5E7EB] dark:border-[#2e3440]">
                    <th className="px-6 py-4">Établissement</th>
                    <th className="px-6 py-4">Adresse & Contact</th>
                    <th className="px-6 py-4 text-right">CA Cumulé</th>
                    <th className="px-6 py-4 text-right">Stock</th>
                    <th className="px-6 py-4 text-right">Personnel</th>
                    <th className="px-6 py-4 text-right">Catalogue</th>
                    <th className="px-6 py-4 text-center">Frais de Franchise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F1F6] dark:divide-[#2e3440] text-xs font-semibold">
                  {filteredStores.map((store) => (
                    <tr
                      key={store.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-100 dark:bg-[#2e3440] rounded-xl flex items-center justify-center text-[#868e96] dark:text-[#8c96a5]">
                            <Building className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[#171717] dark:text-white font-bold uppercase text-[11px] tracking-wider">
                              {store.name}
                            </p>
                            {store.code && (
                              <span className="text-[10px] font-extrabold text-[#FF6D00] uppercase mt-0.5 block">
                                Code: {store.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-500 dark:text-slate-400 space-y-1">
                        {store.address ? (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {store.address}
                          </p>
                        ) : (
                          <p className="text-slate-400 font-normal italic">Pas d'adresse renseignée</p>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right font-black text-[#171717] dark:text-white">
                        {new Intl.NumberFormat("fr-FR").format(store.totalSales)} FCFA
                      </td>
                      <td className="px-6 py-5 text-right text-amber-500 font-extrabold">
                        {new Intl.NumberFormat("fr-FR").format(store.totalStock)} unités
                      </td>
                      <td className="px-6 py-5 text-right text-[#171717] dark:text-white">
                        {store.employeeCount} employé{store.employeeCount !== 1 && "s"}
                      </td>
                      <td className="px-6 py-5 text-right text-slate-500 dark:text-slate-400">
                        {store.productsCount} articles
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-500 px-3 py-1 text-[10px] font-extrabold uppercase">
                          <Percent className="h-3 w-3" />
                          {store.commission}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Store Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F1F6] dark:border-[#2e3440]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#171717] dark:text-white flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#FF6D00]" />
                  Nouvel Établissement
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStore} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Nom de l'établissement *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStore.name}
                      onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                      placeholder="Ex: Parabellum Marcory"
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Code Établissement
                    </label>
                    <input
                      type="text"
                      value={newStore.code}
                      onChange={(e) => setNewStore({ ...newStore, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: MAR"
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Comission Franchise (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newStore.commission}
                      onChange={(e) => setNewStore({ ...newStore, commission: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Adresse physique
                  </label>
                  <input
                    type="text"
                    value={newStore.address}
                    onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                    placeholder="Ex: Boulevard Valéry Giscard d'Estaing, Abidjan"
                    className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={newStore.phone}
                      onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                      placeholder="Ex: +225 0707070707"
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Adresse Email
                    </label>
                    <input
                      type="email"
                      value={newStore.email}
                      onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                      placeholder="Ex: contact@store.com"
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#F0F1F6] dark:border-[#2e3440]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-[#E5E7EB] dark:border-[#2e3440] px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-[#FF6D00] text-white hover:bg-[#E05300] px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                    Enregistrer
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
