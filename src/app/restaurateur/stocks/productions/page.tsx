'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChefHat, Loader2, Play, Info } from 'lucide-react'
import { getProductsWithRecipes, produceProductAction, getProductionHistory } from '@/app/actions/production'
import { CrudTable } from '@/components/ui/ParabellumCrudTable'

export default function ProductionsPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [products, setProducts] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const loadData = async () => {
    if (!storeId) return
    try {
      setLoading(true)
      const [prodList, histList] = await Promise.all([
        getProductsWithRecipes(storeId),
        getProductionHistory(storeId)
      ])
      setProducts(prodList)
      setHistory(histList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      void loadData()
    }
  }, [storeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId || !selectedProductId || !quantity) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess(false)

      const qty = parseInt(quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        setError("Veuillez saisir une quantité positive.")
        return
      }

      const res = await produceProductAction({
        productId: selectedProductId,
        quantity: qty,
        storeId
      })

      if (res.success) {
        setSuccess(true)
        setQuantity('1')
        setSelectedProductId('')
        await loadData()
      } else {
        setError((res as any).error || "Erreur lors de la production.")
      }
    } catch (err) {
      console.error(err)
      setError("Erreur technique lors de la production.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Les productions</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">
            Déduisez les ingrédients de vos recettes pour fabriquer des produits finis en stock
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Production Command Card */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-[#dee2e6] p-6 shadow-sm h-fit space-y-6">
            <h2 className="text-base font-black text-[#212529] uppercase tracking-wider flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-[#FF6D00]" />
              Lancer une Production
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd] ml-1">Produit à Produire</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/20"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actuel: {p.stockQuantity || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd] ml-1">Quantité à fabriquer</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/20"
                />
              </div>

              {selectedProduct && (
                <div className="rounded-2xl bg-orange-50/50 border border-orange-100 p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black text-[#FF6D00] uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Besoins en ingrédients (recette)
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedProduct.ingredients.map((item: any) => {
                      const totalNeeded = item.quantity * (parseInt(quantity, 10) || 1)
                      return (
                        <li key={item.id} className="flex justify-between text-xs text-[#495057] font-semibold">
                          <span>{item.ingredient.name}</span>
                          <span className="font-bold text-black">
                            {item.quantity} x {quantity || 1} = {totalNeeded} {item.ingredient.unit}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {error && <p className="text-xs font-bold text-red-500">{error}</p>}
              {success && <p className="text-xs font-bold text-green-600">Production enregistrée et stock mis à jour !</p>}

              <button
                type="submit"
                disabled={submitting || !selectedProductId}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-[#FF6D00] hover:bg-[#E66200] transition-colors disabled:opacity-50 shadow-md shadow-orange-500/10"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Lancer la fabrication
              </button>
            </form>
          </div>

          {/* History / Logs */}
          <div className="lg:col-span-2 space-y-6">
            <CrudTable
              title="Journal des Consommations de Production"
              rows={history}
              emptyLabel="Aucune production enregistrée"
              columns={[
                { key: 'createdAt', label: 'Date/Heure' },
                { key: 'ingredient', label: 'Ingrédient Consommé' },
                { key: 'quantity', label: 'Quantité déduite' },
                { key: 'note', label: 'Action associée' }
              ]}
              renderRow={(m) => (
                <tr key={m.id} className="transition hover:bg-[#fafbfc]">
                  <td className="px-6 py-4 text-xs text-[#adb5bd] font-medium">
                    {new Date(m.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[#212529]">
                    {m.ingredient.name}
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-red-500">
                    {m.quantity} {m.ingredient.unit}
                  </td>
                  <td className="px-6 py-4 text-xs text-[#868e96] font-medium">
                    {m.note}
                  </td>
                </tr>
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}
