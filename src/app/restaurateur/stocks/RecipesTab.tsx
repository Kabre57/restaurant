'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  Search, Plus, Trash, Loader2, Save, BookOpen, Package2, Info, 
  ChevronUp, ChevronDown, ChefHat, Tag, ClipboardList, HelpCircle
} from 'lucide-react'
import { getProductRecipe, saveProductRecipe } from '@/app/actions/inventory/inventory'

type StockProduct = {
  id: string
  name: string
  price: number
  image: string | null
  trackStock: boolean
  stockQuantity: number
  minStockLevel: number
  costPrice?: number
  category?: { name: string } | null
}

type GlobalIngredient = {
  id: string
  name: string
  unit: string
  costPrice?: number
}

type RecipeItem = {
  ingredientId: string
  name: string
  unit: string
  quantity: number
  sectionGroup: string
  preparationNote: string
  isSubRecipe: boolean
  displayOrder: number
  costPrice: number
}

type RecipesTabProps = {
  products: StockProduct[]
  globalIngredients: GlobalIngredient[]
}

export function RecipesTab({ products, globalIngredients }: RecipesTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null)
  
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showNotification(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }
  
  // New recipe item form state
  const [isSubRecipe, setIsSubRecipe] = useState(false)
  const [newRecipeItemId, setNewRecipeItemId] = useState("")
  const [newRecipeQty, setNewRecipeQty] = useState("")
  const [newRecipeUnit, setNewRecipeUnit] = useState("")
  const [newRecipeGroup, setNewRecipeGroup] = useState("")
  const [newRecipeNote, setNewRecipeNote] = useState("")

  // Load product recipe when selected
  useEffect(() => {
    if (selectedProduct) {
      void loadRecipe(selectedProduct.id)
    }
  }, [selectedProduct])

  // Update default unit when an ingredient or sub-recipe is selected
  useEffect(() => {
    if (!newRecipeItemId) {
      setNewRecipeUnit("")
      return
    }
    if (isSubRecipe) {
      const prod = products.find(p => p.id === newRecipeItemId)
      setNewRecipeUnit(prod ? "portions" : "unité")
    } else {
      const ing = globalIngredients.find(g => g.id === newRecipeItemId)
      setNewRecipeUnit(ing?.unit || "g")
    }
  }, [newRecipeItemId, isSubRecipe, products, globalIngredients])

  async function loadRecipe(productId: string) {
    setRecipeLoading(true)
    const rawRecipe = await getProductRecipe(productId)
    const formattedRecipe = (rawRecipe as any[]).map((r) => {
      const isSub = r.isSubRecipe
      const name = isSub ? (r.ingredientProduct?.name || "Sous-recette") : (r.ingredientBase?.name || "Ingrédient")
      const unit = r.unit || (isSub ? "portions" : (r.ingredientBase?.unit || "g"))
      const costPrice = isSub ? (r.ingredientProduct?.costPrice || 0) : (r.ingredientBase?.costPrice || 0)
      return {
        ingredientId: r.ingredientId,
        name,
        unit,
        quantity: r.quantity,
        sectionGroup: r.sectionGroup || "Ingrédients principaux",
        preparationNote: r.preparationNote || "",
        isSubRecipe: isSub,
        displayOrder: r.displayOrder || 0,
        costPrice
      }
    })
    
    // Sort by displayOrder asc
    formattedRecipe.sort((a, b) => a.displayOrder - b.displayOrder)
    setRecipeItems(formattedRecipe)
    setRecipeLoading(false)
  }

  // Get unique section groups in the current recipe
  const sectionGroups = Array.from(new Set(recipeItems.map(item => item.sectionGroup)))
  if (sectionGroups.length === 0) {
    sectionGroups.push("Ingrédients principaux")
  }

  function handleAddIngredientToRecipe() {
    if (!newRecipeItemId || !newRecipeQty) return
    const quantity = parseFloat(newRecipeQty)
    if (isNaN(quantity) || quantity <= 0) return

    let name = ""
    let costPrice = 0
    const unit = newRecipeUnit || "g"

    if (isSubRecipe) {
      const prod = products.find(p => p.id === newRecipeItemId)
      if (!prod) return
      name = prod.name
      costPrice = prod.costPrice || 0
    } else {
      const ing = globalIngredients.find(g => g.id === newRecipeItemId)
      if (!ing) return
      name = ing.name
      costPrice = ing.costPrice || 0
    }

    // Check duplicate in the same section
    const groupName = newRecipeGroup.trim() || "Ingrédients principaux"
    if (recipeItems.some(item => item.ingredientId === newRecipeItemId && item.sectionGroup === groupName)) {
      showNotification("Cet ingrédient ou sous-recette est déjà présent dans ce groupe.", "error")
      return
    }

    const maxOrder = recipeItems.reduce((max, item) => item.displayOrder > max ? item.displayOrder : max, 0)

    setRecipeItems([...recipeItems, {
      ingredientId: newRecipeItemId,
      name,
      unit,
      quantity,
      sectionGroup: groupName,
      preparationNote: newRecipeNote.trim(),
      isSubRecipe,
      displayOrder: maxOrder + 1,
      costPrice
    }])

    setNewRecipeItemId("")
    setNewRecipeQty("")
    setNewRecipeNote("")
  }

  function handleRemoveIngredientFromRecipe(ingredientId: string, groupName: string) {
    setRecipeItems(recipeItems.filter(item => !(item.ingredientId === ingredientId && item.sectionGroup === groupName)))
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const newItems = [...recipeItems]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newItems.length) return

    // Swap items
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp

    // Reassign displayOrder
    newItems.forEach((item, idx) => {
      item.displayOrder = idx
    })

    setRecipeItems(newItems)
  }

  async function handleSaveRecipe() {
    if (!selectedProduct) return
    setRecipeLoading(true)
    const dataToSave = recipeItems.map((item, index) => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      sectionGroup: item.sectionGroup,
      preparationNote: item.preparationNote,
      isSubRecipe: item.isSubRecipe,
      displayOrder: index
    }))

    const res = await saveProductRecipe(selectedProduct.id, dataToSave) as { success: boolean; error?: string }
    if (res.success) {
      showNotification("Fiche technique Marmiton enregistrée avec succès !", "success")
    } else {
      showNotification(res.error || "Impossible d'enregistrer la recette.", "error")
    }
    setRecipeLoading(false)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Margins and Cost computation
  const totalRecipeCost = recipeItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0)
  const sellingPrice = selectedProduct?.price || 0
  const grossMargin = sellingPrice - totalRecipeCost
  const foodCostRatio = sellingPrice > 0 ? (totalRecipeCost / sellingPrice) * 100 : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Products list (Left) */}
      <div className="lg:col-span-4 bg-white border border-[#dee2e6] rounded-[2rem] p-6 shadow-sm space-y-4 h-fit">
        <div className="flex items-center gap-2 border-b border-[#f1f3f5] pb-3">
          <ChefHat className="w-5 h-5 text-[#FF6D00]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-[#212529]">1. Choisir un produit</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
          <input 
            type="text" 
            placeholder="Rechercher un plat..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6D00]/20"
          />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isSelected = selectedProduct?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${isSelected ? 'bg-[#212529] border-[#212529] text-white shadow-lg shadow-black/10' : 'bg-[#f8f9fa] border-[#dee2e6] text-[#495057] hover:bg-[#fafbfc]'}`}
              >
                {p.image ? (
                  <Image src={p.image} alt={p.name} width={36} height={36} unoptimized className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${isSelected ? 'bg-white/10' : 'bg-white border border-[#dee2e6]'}`}>🍔</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black uppercase">{p.name}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-[#adb5bd]'}`}>{p.category?.name || "Sans catégorie"}</p>
                    <p className={`text-[10px] font-black ${isSelected ? 'text-white' : 'text-[#212529]'}`}>{p.price} CFA</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recipe Editor (Right) */}
      <div className="lg:col-span-8 bg-white border border-[#dee2e6] rounded-[2rem] p-6 shadow-sm flex flex-col justify-between min-h-[500px]">
        {selectedProduct ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f1f3f5] pb-4">
              <div>
                <span className="text-[9px] font-black text-[#FF6D00] uppercase tracking-widest block mb-0.5">Fiche Technique Modulaire</span>
                <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight">{selectedProduct.name}</h2>
              </div>
              <button 
                onClick={handleSaveRecipe}
                disabled={recipeLoading}
                className="flex items-center gap-2 bg-[#212529] hover:bg-black text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50 self-start sm:self-center"
              >
                {recipeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer la recette
              </button>
            </div>

            {/* Financial indicators summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#f8f9fa] border border-[#dee2e6] rounded-2xl p-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Prix de vente</span>
                <span className="text-sm font-black text-[#212529]">{sellingPrice.toLocaleString('fr-FR')} CFA</span>
              </div>
              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#dee2e6] pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Coût de revient calculé</span>
                <span className={`text-sm font-black ${totalRecipeCost > sellingPrice ? 'text-red-500' : 'text-green-600'}`}>
                  {totalRecipeCost.toLocaleString('fr-FR')} CFA
                </span>
              </div>
              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#dee2e6] pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Marge Brute / Ratio</span>
                <span className="text-sm font-black text-[#212529]">
                  {grossMargin.toLocaleString('fr-FR')} CFA ({foodCostRatio.toFixed(1)}% FC)
                </span>
              </div>
            </div>

            {/* Recipe item list grouped Marmiton-style */}
            <div className="space-y-6">
              {recipeItems.length === 0 ? (
                <div className="p-12 border border-dashed border-[#dee2e6] rounded-2xl flex flex-col items-center justify-center text-[#adb5bd] text-center">
                  <Package2 className="w-10 h-10 mb-2 text-[#FF6D00] opacity-50" />
                  <p className="text-xs font-black uppercase tracking-widest">Aucun ingrédient ou sous-recette.</p>
                  <p className="text-[10px] font-semibold mt-1">Utilisez le formulaire ci-dessous pour composer la recette par groupes logiques.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group items by sectionGroup */}
                  {Array.from(new Set(recipeItems.map(ri => ri.sectionGroup))).map((groupName) => {
                    const groupItems = recipeItems.filter(ri => ri.sectionGroup === groupName)
                    const groupCost = groupItems.reduce((sum, ri) => sum + (ri.quantity * ri.costPrice), 0)

                    return (
                      <div key={groupName} className="border border-[#dee2e6] rounded-2xl overflow-hidden shadow-sm">
                        {/* Section Group Header */}
                        <div className="bg-[#f8f9fa] border-b border-[#dee2e6] px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-[#FF6D00]" />
                            <span className="text-xs font-black uppercase tracking-wider text-[#212529]">{groupName}</span>
                          </div>
                          <span className="text-[10px] font-black text-[#868e96] uppercase font-mono">
                            Coût : {groupCost.toLocaleString('fr-FR')} CFA
                          </span>
                        </div>

                        {/* Section Group Items */}
                        <div className="divide-y divide-[#dee2e6]">
                          {groupItems.map((item) => {
                            const globalIndex = recipeItems.findIndex(ri => ri.ingredientId === item.ingredientId && ri.sectionGroup === item.sectionGroup)
                            const itemCost = item.quantity * item.costPrice

                            return (
                              <div key={item.ingredientId} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white hover:bg-[#fcfdfe] transition-colors">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-[#212529] uppercase">{item.name}</span>
                                    {item.isSubRecipe && (
                                      <span className="bg-[#FFF5E6] text-[#FF6D00] text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-[#FFE0B2]">
                                        Sous-recette
                                      </span>
                                    )}
                                  </div>
                                  
                                  {item.preparationNote && (
                                    <p className="text-[10px] text-[#868e96] italic">
                                      Note : {item.preparationNote}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-3 text-[9px] font-black text-[#adb5bd] uppercase tracking-widest font-mono">
                                    <span>Coût unit. : {item.costPrice} CFA</span>
                                    <span>•</span>
                                    <span className="text-[#212529]">Total : {itemCost.toLocaleString('fr-FR')} CFA</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  {/* Quantity and Unit Input */}
                                  <div className="flex items-center gap-1.5 bg-white border border-[#dee2e6] rounded-xl px-2.5 py-1.5">
                                    <input 
                                      type="number"
                                      step="any"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0
                                        setRecipeItems(recipeItems.map((ri, idx) => idx === globalIndex ? { ...ri, quantity: val } : ri))
                                      }}
                                      className="w-14 text-xs font-black text-center focus:outline-none"
                                    />
                                    <span className="text-[10px] font-black text-[#adb5bd] font-mono select-none">
                                      {item.unit}
                                    </span>
                                  </div>

                                  {/* Up / Down arrows for ordering */}
                                  <div className="flex flex-col gap-0.5">
                                    <button 
                                      onClick={() => moveItem(globalIndex, 'up')}
                                      disabled={globalIndex === 0}
                                      className="p-1 rounded bg-[#f1f3f5] hover:bg-[#e9ecef] disabled:opacity-30 text-[#495057]"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => moveItem(globalIndex, 'down')}
                                      disabled={globalIndex === recipeItems.length - 1}
                                      className="p-1 rounded bg-[#f1f3f5] hover:bg-[#e9ecef] disabled:opacity-30 text-[#495057]"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Delete */}
                                  <button 
                                    onClick={() => handleRemoveIngredientFromRecipe(item.ingredientId, item.sectionGroup)}
                                    className="p-2.5 rounded-xl bg-[#fff5f5] hover:bg-[#ffe3e3] text-[#e03131] transition-all border border-[#ffc9c9]"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick Add Form Section */}
            <div className="pt-6 border-t border-[#f1f3f5] space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#212529] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#FF6D00]" />
                Associer un composant ou une sous-recette
              </h4>

              {/* Type selector toggle */}
              <div className="flex bg-[#f8f9fa] p-1 border border-[#dee2e6] rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => { setIsSubRecipe(false); setNewRecipeItemId(""); }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!isSubRecipe ? 'bg-white text-[#212529] shadow-sm' : 'text-[#adb5bd]'}`}
                >
                  Ingrédient Brut
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSubRecipe(true); setNewRecipeItemId(""); }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isSubRecipe ? 'bg-white text-[#212529] shadow-sm' : 'text-[#adb5bd]'}`}
                >
                  Sous-Recette (Autre Plat)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Select Component */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Composant</label>
                  <select
                    value={newRecipeItemId}
                    onChange={(e) => setNewRecipeItemId(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider focus:outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {isSubRecipe ? (
                      products
                        .filter(p => p.id !== selectedProduct.id) // exclude current product
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                    ) : (
                      globalIngredients.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Quantité</label>
                  <input 
                    type="number"
                    step="any"
                    placeholder="Ex: 150"
                    value={newRecipeQty}
                    onChange={(e) => setNewRecipeQty(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-3 py-2.5 text-xs font-black text-center focus:outline-none"
                  />
                </div>

                {/* Unit override */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Unité</label>
                  <input 
                    type="text"
                    placeholder="Ex: g"
                    value={newRecipeUnit}
                    onChange={(e) => setNewRecipeUnit(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-3 py-2.5 text-xs font-black text-center focus:outline-none font-mono"
                  />
                </div>

                {/* Section Group */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Groupe / Phase (Marmiton)</label>
                  <input 
                    type="text"
                    placeholder="Ex: Pour la pâte"
                    value={newRecipeGroup}
                    onChange={(e) => setNewRecipeGroup(e.target.value)}
                    list="recipe-groups-suggestions"
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-3 py-2.5 text-xs font-black focus:outline-none"
                  />
                  <datalist id="recipe-groups-suggestions">
                    {sectionGroups.map(g => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Note / Instruction */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#adb5bd]">Instructions de préparation pour cet ingrédient</label>
                <input 
                  type="text"
                  placeholder="Ex: Mélanger avec la farine puis pétrir pendant 10 min..."
                  value={newRecipeNote}
                  onChange={(e) => setNewRecipeNote(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none"
                />
              </div>

              <button 
                type="button"
                onClick={handleAddIngredientToRecipe}
                disabled={!newRecipeItemId || !newRecipeQty}
                className="flex items-center justify-center gap-2 bg-[#212529] hover:bg-black text-white w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter à la fiche technique
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#adb5bd] text-center p-8">
            <BookOpen className="w-16 h-16 mb-4 text-[#FF6D00] opacity-25" />
            <h3 className="text-sm font-black uppercase tracking-widest">Aucun produit sélectionné</h3>
            <p className="text-xs font-semibold mt-1">Sélectionnez un plat du catalogue dans la colonne de gauche pour éditer sa fiche technique, ses phases de préparation (Marmiton) ou ses sous-recettes.</p>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border text-xs font-black uppercase tracking-widest shadow-2xl transition-all animate-bounce ${
          toast.type === 'success' 
            ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]' 
            : 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]'
        }`}>
          <span>{toast.type === 'success' ? '✨' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
