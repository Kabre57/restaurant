'use client'

import React, { useState, useEffect } from 'react'
import { Search, AlertCircle, Save, Loader2, Plus, Trash, Check } from 'lucide-react'
import {
  updateInventory,
  createIngredient,
  deleteInventory
} from '@/app/actions/inventory'

type IngredientInventory = {
  id: string
  quantity: number
  minStock: number
  ingredient: {
    id: string
    name: string
    unit: string
  }
}

type IngredientsTabProps = {
  storeId: string
  inventoryList: IngredientInventory[]
  onRefresh: () => void
}

export function IngredientsTab({ storeId, inventoryList, onRefresh }: IngredientsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const [ingredientEdits, setIngredientEdits] = useState<Record<string, { quantity: string; minStock: string }>>({})

  // Synchro initial state edits
  useEffect(() => {
    const edits: Record<string, { quantity: string; minStock: string }> = {}
    inventoryList.forEach((item) => {
      edits[item.id] = {
        quantity: item.quantity.toString(),
        minStock: item.minStock.toString()
      }
    })
    setIngredientEdits(edits)
  }, [inventoryList])

  // Add new ingredient modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newIngName, setNewIngName] = useState("")
  const [newIngUnit, setNewIngUnit] = useState("u")
  const [newIngQty, setNewIngQty] = useState("")
  const [newIngMinStock, setNewIngMinStock] = useState("")
  const [addIngLoading, setAddIngLoading] = useState(false)
  const [addError, setAddError] = useState("")

  const getIngredientCategory = (name: string, unit: string) => {
    const lowerName = name.toLowerCase()
    if (
      unit === 'u' ||
      lowerName.includes('boite') ||
      lowerName.includes('boîte') ||
      lowerName.includes('gobelet') ||
      lowerName.includes('sac') ||
      lowerName.includes('serviette') ||
      lowerName.includes('paille') ||
      lowerName.includes('pot') ||
      lowerName.includes('emballage')
    ) {
      return 'Matériel & Emballage'
    }
    return 'Ingrédient Alimentaire'
  }

  async function handleUpdateInventory(invId: string) {
    setUpdatingId(invId)
    const edits = ingredientEdits[invId]
    if (!edits) {
      setUpdatingId(null)
      return
    }
    const newQty = parseFloat(edits.quantity)
    const newMin = parseFloat(edits.minStock)

    if (isNaN(newQty) || isNaN(newMin)) {
      setUpdatingId(null)
      return
    }

    const res = await updateInventory(invId, newQty, newMin)
    if (res.success) {
      onRefresh()
    }
    setUpdatingId(null)
  }

  async function handleDeleteInventoryItem(invId: string) {
    if (!confirm("Voulez-vous vraiment retirer cet élément de votre inventaire de cuisine ?")) return
    setUpdatingId(invId)
    const res = await deleteInventory(invId)
    if (res.success) {
      onRefresh()
    }
    setUpdatingId(null)
  }

  async function handleCreateIngredient(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")
    if (!newIngName.trim() || !newIngUnit) {
      setAddError("Le nom et l'unité sont obligatoires.")
      return
    }

    const qty = parseFloat(newIngQty) || 0
    const minS = parseFloat(newIngMinStock) || 0

    setAddIngLoading(true)
    const res = await createIngredient({
      storeId,
      name: newIngName.trim(),
      unit: newIngUnit,
      quantity: qty,
      minStock: minS
    })

    if (res.success) {
      setNewIngName("")
      setNewIngQty("")
      setNewIngMinStock("")
      setShowAddModal(false)
      onRefresh()
    } else {
      setAddError(res.error || "Une erreur est survenue lors de la création.")
    }
    setAddIngLoading(false)
  }

  const filteredInventory = inventoryList.filter(item => 
    item.ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-[#dee2e6] p-4 rounded-[2rem] shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
          <input 
            type="text" 
            placeholder="RECHERCHER UN INGRÉDIENT OU UN EMBALLAGE..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] uppercase"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#212529] hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Créer un consommable
        </button>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#dee2e6] bg-white shadow-sm sm:rounded-[2.5rem]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left border-collapse">
            <thead>
              <tr className="bg-[#fafbfc] border-b border-[#f1f3f5]">
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Ingrédient & Emballage</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Type</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-center">Unité</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-center w-36">Seuil Alerte</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-center w-36">Stock Actuel</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-center">État</th>
                <th className="p-6 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {filteredInventory.map((item) => {
                const isLow = item.quantity <= item.minStock
                const edits = ingredientEdits[item.id] || { quantity: "0", minStock: "0" }
                const isEditing = edits.quantity !== item.quantity.toString() || edits.minStock !== item.minStock.toString()
                const category = getIngredientCategory(item.ingredient.name, item.ingredient.unit)

                return (
                  <tr key={item.id} className="hover:bg-[#fafbfc] transition-all">
                    <td className="p-6 font-black text-sm text-[#212529] uppercase">
                      {item.ingredient.name}
                    </td>
                    <td className="p-6">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${category === 'Matériel & Emballage' ? 'bg-[#e7f5ff] text-[#1c7ed6] border border-[#a5d8ff]' : 'bg-[#fff4e6] text-[#fd7e14] border border-[#ffd8a8]'}`}>
                        {category}
                      </span>
                    </td>
                    <td className="p-6 text-center text-xs font-bold text-[#adb5bd] font-mono">
                      {item.ingredient.unit}
                    </td>
                    <td className="p-6">
                      <input 
                        type="number" 
                        step="any"
                        value={edits.minStock}
                        onChange={(e) => setIngredientEdits({
                          ...ingredientEdits,
                          [item.id]: { ...edits, minStock: e.target.value }
                        })}
                        className="w-24 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-2.5 py-2 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-[#212529]"
                      />
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-2">
                        <input 
                          type="number" 
                          step="any"
                          value={edits.quantity}
                          onChange={(e) => setIngredientEdits({
                            ...ingredientEdits,
                            [item.id]: { ...edits, quantity: e.target.value }
                          })}
                          className={`w-24 bg-[#f8f9fa] border rounded-xl px-2.5 py-2 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-[#212529] ${isLow ? 'border-[#ff6b6b] text-[#e03131] bg-[#fff5f5]' : 'border-[#dee2e6] text-[#212529]'}`}
                        />
                        {isLow && <AlertCircle className="w-4 h-4 text-[#e03131]" />}
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isLow ? 'bg-[#fff5f5] text-[#e03131]' : 'bg-[#ebfbee] text-[#2f9e44]'}`}>
                        {isLow ? 'CRITIQUE' : 'OK'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          disabled={!isEditing || updatingId === item.id}
                          onClick={() => handleUpdateInventory(item.id)}
                          className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-[#212529] text-white shadow-lg hover:bg-black' : 'text-[#adb5bd] bg-[#f8f9fa]'}`}
                        >
                          {updatingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button 
                          disabled={updatingId === item.id}
                          onClick={() => handleDeleteInventoryItem(item.id)}
                          className="p-3 rounded-xl bg-[#fff5f5] hover:bg-[#ffe3e3] text-[#e03131] transition-all border border-[#ffc9c9]"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-[#dee2e6] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#f1f3f5] pb-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#212529]">Créer un consommable</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#adb5bd] hover:text-[#212529] font-black text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateIngredient} className="space-y-4">
              {addError && (
                <div className="p-3 bg-[#fff5f5] text-[#e03131] rounded-xl text-xs font-black uppercase tracking-widest border border-[#ffc9c9]">
                  {addError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Nom (ex: Pain Burger, Boîte Carton XL)</label>
                <input 
                  type="text"
                  required
                  placeholder="NOM DE L'INGRÉDIENT OU EMBALLAGE..."
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Unité de mesure</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529]"
                  >
                    <option value="u">Unités (u)</option>
                    <option value="g">Grammes (g)</option>
                    <option value="ml">Millilitres (ml)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Stock initial</label>
                  <input 
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={newIngQty}
                    onChange={(e) => setNewIngQty(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#212529]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">Seuil d'alerte de stock critique</label>
                <input 
                  type="number"
                  step="any"
                  required
                  placeholder="Ex: 10"
                  value={newIngMinStock}
                  onChange={(e) => setNewIngMinStock(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#212529]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-[#f1f3f5] hover:bg-[#e9ecef] text-[#495057] py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addIngLoading}
                  className="flex-1 bg-[#212529] hover:bg-black text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {addIngLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
