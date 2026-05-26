'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Search, Plus, Trash, Loader2, Save, BookOpen, Package2 } from 'lucide-react'
import { getProductRecipe, saveProductRecipe } from '@/app/actions/inventory'

type StockProduct = {
  id: string
  name: string
  image: string | null
  trackStock: boolean
  stockQuantity: number
  minStockLevel: number
  category?: { name: string } | null
}

type GlobalIngredient = {
  id: string
  name: string
  unit: string
}

type RecipeItem = {
  ingredientId: string
  name: string
  unit: string
  quantity: number
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
  const [newRecipeIngId, setNewRecipeIngId] = useState("")
  const [newRecipeQty, setNewRecipeQty] = useState("")

  // Load product recipe when selected
  useEffect(() => {
    if (selectedProduct) {
      void loadRecipe(selectedProduct.id)
    }
  }, [selectedProduct])

  async function loadRecipe(productId: string) {
    setRecipeLoading(true)
    const rawRecipe = await getProductRecipe(productId)
    const formattedRecipe = (rawRecipe as any[]).map((r) => ({
      ingredientId: r.ingredientId,
      name: r.ingredient.name,
      unit: r.ingredient.unit,
      quantity: r.quantity
    }))
    setRecipeItems(formattedRecipe)
    setRecipeLoading(false)
  }

  function handleAddIngredientToRecipe() {
    if (!newRecipeIngId || !newRecipeQty) return
    const quantity = parseFloat(newRecipeQty)
    if (isNaN(quantity) || quantity <= 0) return

    const ing = globalIngredients.find(g => g.id === newRecipeIngId)
    if (!ing) return

    if (recipeItems.some(item => item.ingredientId === newRecipeIngId)) {
      alert("Cet ingrédient est déjà présent dans la fiche technique.")
      return
    }

    setRecipeItems([...recipeItems, {
      ingredientId: newRecipeIngId,
      name: ing.name,
      unit: ing.unit,
      quantity
    }])
    setNewRecipeIngId("")
    setNewRecipeQty("")
  }

  function handleRemoveIngredientFromRecipe(ingredientId: string) {
    setRecipeItems(recipeItems.filter(item => item.ingredientId !== ingredientId))
  }

  async function handleSaveRecipe() {
    if (!selectedProduct) return
    setRecipeLoading(true)
    const dataToSave = recipeItems.map((item) => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity
    }))

    const res = await saveProductRecipe(selectedProduct.id, dataToSave) as { success: boolean; error?: string }
    if (res.success) {
      alert("Fiche technique enregistrée avec succès !")
    } else {
      alert(res.error || "Impossible d'enregistrer la recette.")
    }
    setRecipeLoading(false)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Products list (Left) */}
      <div className="lg:col-span-4 bg-white border border-[#dee2e6] rounded-[2rem] p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#adb5bd]">1. Choisir un produit</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
          <input 
            type="text" 
            placeholder="Filtrer..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-10 pr-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] uppercase"
          />
        </div>

        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isSelected = selectedProduct?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-[#212529] border-[#212529] text-white' : 'bg-[#f8f9fa] border-[#dee2e6] text-[#495057] hover:bg-[#fafbfc]'}`}
              >
                {p.image ? (
                  <Image src={p.image} alt={p.name} width={36} height={36} unoptimized className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${isSelected ? 'bg-white/10' : 'bg-white border border-[#dee2e6]'}`}>🍔</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black uppercase">{p.name}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-[#adb5bd]'}`}>{p.category?.name}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recipe Editor (Right) */}
      <div className="lg:col-span-8 bg-white border border-[#dee2e6] rounded-[2rem] p-6 shadow-sm flex flex-col justify-between min-h-[480px]">
        {selectedProduct ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#f1f3f5] pb-4">
              <div>
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block mb-0.5">Fiche Technique POS</span>
                <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight">{selectedProduct.name}</h2>
              </div>
              <button 
                onClick={handleSaveRecipe}
                disabled={recipeLoading}
                className="flex items-center gap-2 bg-[#212529] hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
              >
                {recipeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer la recette
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#adb5bd]">Ingrédients & Emballages requis pour 1 portion :</h4>
              
              {recipeItems.length === 0 ? (
                <div className="p-8 border border-dashed border-[#dee2e6] rounded-2xl flex flex-col items-center justify-center text-[#adb5bd] text-center">
                  <Package2 className="w-8 h-8 mb-2 opacity-25" />
                  <p className="text-xs font-bold uppercase tracking-widest">Aucun ingrédient configuré pour ce produit.</p>
                  <p className="text-[10px] font-semibold mt-1">Utilisez le formulaire ci-dessous pour composer la recette.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipeItems.map((item) => (
                    <div key={item.ingredientId} className="flex items-center justify-between p-3 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-[#212529] uppercase block">{item.name}</span>
                        <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest font-mono">Unité : {item.unit}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setRecipeItems(recipeItems.map(ri => ri.ingredientId === item.ingredientId ? { ...ri, quantity: val } : ri))
                          }}
                          className="w-20 bg-white border border-[#dee2e6] rounded-xl px-2 py-1.5 text-xs font-black text-center focus:outline-none focus:ring-2 focus:ring-[#212529]"
                        />
                        <button 
                          onClick={() => handleRemoveIngredientFromRecipe(item.ingredientId)}
                          className="p-2 rounded-lg bg-[#fff5f5] hover:bg-[#ffe3e3] text-[#e03131] transition-all border border-[#ffc9c9]"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#f1f3f5] space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#212529]">Associer un ingrédient ou emballage</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={newRecipeIngId}
                  onChange={(e) => setNewRecipeIngId(e.target.value)}
                  className="flex-1 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529]"
                >
                  <option value="">Sélectionner un consommable...</option>
                  {globalIngredients.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.unit})</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    placeholder="Qté"
                    value={newRecipeQty}
                    onChange={(e) => setNewRecipeQty(e.target.value)}
                    className="w-32 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-3 py-3 text-xs font-black text-center focus:outline-none focus:ring-2 focus:ring-[#212529]"
                  />
                  <button 
                    onClick={handleAddIngredientToRecipe}
                    className="bg-[#212529] hover:bg-black text-white p-3 rounded-xl transition-all shadow-md"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#adb5bd] text-center p-8">
            <BookOpen className="w-16 h-16 mb-4 opacity-25" />
            <h3 className="text-sm font-black uppercase tracking-widest">Aucun produit sélectionné</h3>
            <p className="text-xs font-semibold mt-1">Sélectionnez un plat du catalogue dans la colonne de gauche pour éditer sa recette de cuisine ou ses emballages requis.</p>
          </div>
        )}
      </div>
    </div>
  )
}
