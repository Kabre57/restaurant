// src/app/backoffice/stock-transfers/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import RestaurateurLayout from "@/app/restaurateur/layout"
import {
  Truck,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Check,
  ChevronRight,
  ArrowRight,
  Package,
  Calendar,
  Building,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
} from "lucide-react"
import { useToast } from "@/components/ui/Toast"

interface Store {
  id: string
  name: string
  code: string | null
}

interface Product {
  id: string
  name: string
  barcode: string
  stockQuantity: number
  price: number
  trackStock: boolean
}

interface StockTransfer {
  id: string
  fromStoreId: string
  toStoreId: string
  productId: string
  quantity: number
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  notes: string | null
  requestedAt: string
  completedAt: string | null
  product: {
    name: string
    barcode: string | null
  }
  fromStore: {
    id: string
    name: string
  }
  toStore: {
    id: string
    name: string
  }
}

export default function StockTransfersPage() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const userRole = session?.user?.role
  const userStoreId = session?.user?.storeId
  const isAuthorized = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "RESTAURATEUR" || userRole === "MANAGER"

  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    fromStoreId: "",
    toStoreId: "",
    productId: "",
    quantity: 1,
    notes: "",
  })

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch transfers
      const transRes = await fetch("/api/stock-transfers")
      if (!transRes.ok) throw new Error("Erreur de récupération des transferts")
      const transData = await transRes.json()
      if (Array.isArray(transData)) {
        setTransfers(transData)
      }

      // Fetch stores
      const storesRes = await fetch("/api/stores")
      if (!storesRes.ok) throw new Error("Erreur de récupération des établissements")
      const storesData = await storesRes.json()
      if (Array.isArray(storesData)) {
        setStores(storesData)
      }
    } catch (err: any) {
      console.error(err)
      toast(err.message || "Erreur lors du chargement des données", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && isAuthorized) {
      loadData()
    }
  }, [status, userRole])

  // Fetch products when source store changes
  useEffect(() => {
    if (!formData.fromStoreId) {
      setProducts([])
      return
    }

    const fetchProducts = async () => {
      setProductsLoading(true)
      try {
        const res = await fetch(`/api/stores/${formData.fromStoreId}/products-for-transfer`)
        if (!res.ok) throw new Error("Impossible de charger les produits de cet établissement")
        const data = await res.json()
        if (Array.isArray(data)) {
          setProducts(data)
        }
      } catch (err: any) {
        console.error(err)
        toast(err.message || "Erreur de chargement des produits", "error")
      } finally {
        setProductsLoading(false)
      }
    }

    fetchProducts()
  }, [formData.fromStoreId])

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fromStoreId || !formData.toStoreId || !formData.productId || formData.quantity <= 0) {
      toast("Veuillez remplir tous les champs obligatoires", "error")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Erreur lors de la création du transfert")
      }

      toast("Demande de transfert créée avec succès", "success")
      setShowCreateModal(false)
      setFormData({
        fromStoreId: "",
        toStoreId: "",
        productId: "",
        quantity: 1,
        notes: "",
      })
      loadData()
    } catch (err: any) {
      console.error(err)
      toast(err.message || "Erreur lors du transfert", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (transferId: string, newStatus: "APPROVED" | "REJECTED" | "COMPLETED") => {
    const confirmation = window.confirm(
      newStatus === "APPROVED" 
        ? "Voulez-vous approuver cette demande et décrémenter le stock d'origine ?" 
        : newStatus === "COMPLETED" 
        ? "Voulez-vous marquer ce transfert comme réceptionné et incrémenter le stock de destination ?"
        : "Voulez-vous rejeter cette demande de transfert ?"
    )
    if (!confirmation) return

    try {
      const res = await fetch(`/api/stock-transfers/${transferId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Erreur de mise à jour du statut")
      }

      toast(`Transfert mis à jour avec succès : ${newStatus}`, "success")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast(err.message || "Erreur lors de la mise à jour", "error")
    }
  }

  // Check action permissions per transfer
  const canUpdateStatus = (transfer: StockTransfer) => {
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") return true
    // Source store managers can approve/reject
    // Destination store managers can complete
    return userStoreId === transfer.fromStoreId || userStoreId === transfer.toStoreId
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
            Vous n'avez pas l'autorisation d'accéder au module de transfert de stock.
          </p>
        </div>
      </RestaurateurLayout>
    )
  }

  return (
    <RestaurateurLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">
              Logistique & Stocks
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#171717] dark:text-white mt-1">
              Transferts Inter-sites
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Pilotez les mouvements de marchandises et validez les livraisons inter-magasins.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#FF6D00] text-white hover:bg-[#E05300] px-5 py-3 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#FF6D00]/20 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nouveau Transfert
          </button>
        </div>

        {/* Transfers List */}
        <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0F1F6] dark:border-[#2e3440]">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#171717] dark:text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#FF6D00]" />
              Historique des demandes
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-[#FF6D00] animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Chargement des transferts...
              </p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
              Aucun transfert enregistré pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] dark:bg-[#181a20]/40 text-[#868e96] text-[10px] font-black uppercase tracking-wider border-b border-[#E5E7EB] dark:border-[#2e3440]">
                    <th className="px-6 py-4">Produit</th>
                    <th className="px-6 py-4">Établissements</th>
                    <th className="px-6 py-4 text-center">Quantité</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Notes / Dates</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F1F6] dark:divide-[#2e3440] text-xs font-semibold">
                  {transfers.map((transfer) => {
                    const isPending = transfer.status === "PENDING"
                    const canAct = isPending && canUpdateStatus(transfer)

                    return (
                      <tr
                        key={transfer.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-100 dark:bg-[#2e3440] rounded-xl flex items-center justify-center text-[#868e96] dark:text-[#8c96a5]">
                              <Package className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-[#171717] dark:text-white font-bold uppercase text-[11px] tracking-wider">
                                {transfer.product.name}
                              </p>
                              {transfer.product.barcode && (
                                <span className="text-[9px] font-extrabold text-[#FF6D00] uppercase mt-0.5 block">
                                  Gencode: {transfer.product.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                            <span className="text-[#FF6D00] bg-[#FF6D00]/10 px-2.5 py-1.5 rounded-lg border border-[#FF6D00]/10">
                              {transfer.fromStore.name}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-blue-500 bg-blue-500/10 px-2.5 py-1.5 rounded-lg border border-blue-500/10">
                              {transfer.toStore.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-black text-sm text-[#171717] dark:text-white">
                          {transfer.quantity}
                        </td>
                        <td className="px-6 py-5">
                          {transfer.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 px-3 py-1 text-[10px] font-extrabold uppercase">
                              <Clock className="h-3 w-3 animate-pulse" /> En attente
                            </span>
                          )}
                          {transfer.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-500 px-3 py-1 text-[10px] font-extrabold uppercase">
                              <CheckCircle2 className="h-3 w-3" /> Expédié
                            </span>
                          )}
                          {transfer.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 px-3 py-1 text-[10px] font-extrabold uppercase">
                              <CheckCircle2 className="h-3 w-3" /> Réceptionné
                            </span>
                          )}
                          {transfer.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-500 px-3 py-1 text-[10px] font-extrabold uppercase">
                              <XCircle className="h-3 w-3" /> Rejeté
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 space-y-1 text-slate-500 dark:text-slate-400">
                          {transfer.notes && (
                            <p className="flex items-center gap-1.5 italic font-normal text-[11px] text-slate-400">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              "{transfer.notes}"
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Créé le {new Date(transfer.requestedAt).toLocaleDateString("fr-FR")}
                          </p>
                          {transfer.completedAt && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              Fini le {new Date(transfer.completedAt).toLocaleDateString("fr-FR")}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          {canAct ? (
                            <div className="flex items-center justify-center gap-2">
                              {/* Source approval or admin */}
                              {(userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userStoreId === transfer.fromStoreId) && (
                                <button
                                  onClick={() => handleUpdateStatus(transfer.id, "APPROVED")}
                                  className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all cursor-pointer"
                                  title="Approuver & Expédier"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              
                              {/* Destination receipt or admin */}
                              {(userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userStoreId === transfer.toStoreId) && (
                                <button
                                  onClick={() => handleUpdateStatus(transfer.id, "COMPLETED")}
                                  className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all cursor-pointer"
                                  title="Confirmer la réception"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}

                              {/* Reject */}
                              <button
                                onClick={() => handleUpdateStatus(transfer.id, "REJECTED")}
                                className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all cursor-pointer"
                                title="Rejeter la demande"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-center text-slate-400 font-normal italic text-[11px]">
                              Aucune action requise
                            </p>
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

        {/* Create Transfer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#181a20] border border-[#E5E7EB] dark:border-[#2e3440] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F1F6] dark:border-[#2e3440]">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#171717] dark:text-white flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#FF6D00]" />
                  Nouvelle demande de transfert
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTransfer} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* From Store */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Établissement source *
                    </label>
                    <select
                      required
                      value={formData.fromStoreId}
                      onChange={(e) => setFormData({ ...formData, fromStoreId: e.target.value, productId: "" })}
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                    >
                      <option value="">Sélectionner</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Store */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Établissement cible *
                    </label>
                    <select
                      required
                      value={formData.toStoreId}
                      onChange={(e) => setFormData({ ...formData, toStoreId: e.target.value })}
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                    >
                      <option value="">Sélectionner</option>
                      {stores
                        .filter((s) => s.id !== formData.fromStoreId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Product Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Produit à transférer *
                  </label>
                  <div className="relative">
                    <select
                      required
                      disabled={!formData.fromStoreId || productsLoading}
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00] disabled:opacity-50"
                    >
                      <option value="">
                        {productsLoading 
                          ? "Chargement..." 
                          : !formData.fromStoreId 
                          ? "Choisissez l'établissement source d'abord" 
                          : products.length === 0 
                          ? "Aucun produit avec code-barres" 
                          : "Sélectionner un produit"
                        }
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Code: {p.barcode} - Stock: {p.stockQuantity})
                        </option>
                      ))}
                    </select>
                    {productsLoading && (
                      <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-[#FF6D00]" />
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Quantité à transférer *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00]"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Commentaire / Motif
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ex: Réassort suite à rupture de stock"
                    rows={3}
                    className="w-full bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] rounded-xl px-4 py-3 text-xs font-semibold text-[#171717] dark:text-white outline-none focus:border-[#FF6D00] resize-none"
                  />
                </div>

                {/* Actions */}
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
                    disabled={submitting || !formData.productId}
                    className="flex items-center gap-2 rounded-xl bg-[#FF6D00] text-white hover:bg-[#E05300] px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                    Créer la demande
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
