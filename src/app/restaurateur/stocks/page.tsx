'use client'

import React, { useState, useEffect } from 'react'
import {
  Package,
  TrendingDown,
  RefreshCcw,
  Layers,
  Utensils,
  BookOpen,
  Loader2,
  Package2
} from 'lucide-react'
import { getProductsByStore } from '@/app/actions/products'
import {
  getInventoryByStore,
  getAllIngredients
} from '@/app/actions/inventory'
import { useSession } from 'next-auth/react'

// Modular Tabs import
import { ProductsTab } from './ProductsTab'
import { IngredientsTab } from './IngredientsTab'
import { RecipesTab } from './RecipesTab'

type StockProduct = {
  id: string
  name: string
  image: string | null
  trackStock: boolean
  stockQuantity: number
  minStockLevel: number
  category?: { name: string } | null
}

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

type GlobalIngredient = {
  id: string
  name: string
  unit: string
}

export default function RestaurateurStocks() {
  const { data: session, status } = useSession()
  const storeId = session?.user?.storeId as string

  const [activeTab, setActiveTab] = useState<'products' | 'ingredients' | 'recipes'>('products')
  const [products, setProducts] = useState<StockProduct[]>([])
  const [inventoryList, setInventoryList] = useState<IngredientInventory[]>([])
  const [globalIngredients, setGlobalIngredients] = useState<GlobalIngredient[]>([])
  
  const [loading, setLoading] = useState(true)

  async function loadData() {
    if (!storeId) return
    try {
      setLoading(true)

      // Load products
      const rawProducts = await getProductsByStore(storeId)
      setProducts(rawProducts as StockProduct[])

      // Load raw inventory
      const rawInventory = await getInventoryByStore(storeId)
      setInventoryList(rawInventory as any[])

      // Load global ingredients list
      const rawGlobal = await getAllIngredients()
      setGlobalIngredients(rawGlobal as GlobalIngredient[])
    } catch (err) {
      console.error("Failed to load inventory data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (storeId) {
      void loadData()
    } else {
      setLoading(false)
    }
  }, [storeId, status])

  const lowStockProductsCount = products.filter(p => p.trackStock && p.stockQuantity <= p.minStockLevel).length
  const lowStockIngredientsCount = inventoryList.filter(item => item.quantity <= item.minStock).length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Gestion des Stocks</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Multi-niveaux : Produits finis, Ingrédients bruts & Emballages</p>
        </div>
        <button 
          onClick={loadData}
          className="rounded-2xl border border-[#dee2e6] bg-white p-3 text-[#adb5bd] transition-all hover:bg-[#f8f9fa] hover:text-[#212529] self-start"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#dee2e6] gap-2 overflow-x-auto pb-1">
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-widest rounded-t-2xl transition-all ${activeTab === 'products' ? 'bg-white border-t border-x border-[#dee2e6] text-[#212529]' : 'text-[#adb5bd] hover:text-[#212529]'}`}
        >
          <Utensils className="w-4 h-4" />
          Produits POS ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('ingredients')}
          className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-widest rounded-t-2xl transition-all ${activeTab === 'ingredients' ? 'bg-white border-t border-x border-[#dee2e6] text-[#212529]' : 'text-[#adb5bd] hover:text-[#212529]'}`}
        >
          <Layers className="w-4 h-4" />
          Ingrédients & Emballages ({inventoryList.length})
        </button>
        <button 
          onClick={() => setActiveTab('recipes')}
          className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-widest rounded-t-2xl transition-all ${activeTab === 'recipes' ? 'bg-white border-t border-x border-[#dee2e6] text-[#212529]' : 'text-[#adb5bd] hover:text-[#212529]'}`}
        >
          <BookOpen className="w-4 h-4" />
          Recettes & Fiches Techniques
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex items-center gap-5 rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
          <div className="w-14 h-14 bg-[#f1f3f5] rounded-3xl flex items-center justify-center">
            <Package className="w-7 h-7 text-[#212529]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block">Niveau 1 : Produits</span>
            <span className="text-3xl font-black text-[#212529]">{products.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
          <div className="w-14 h-14 bg-[#f1f3f5] rounded-3xl flex items-center justify-center">
            <Package2 className="w-7 h-7 text-[#212529]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block">Niveaux 2 & 3 : Ingrédients</span>
            <span className="text-3xl font-black text-[#212529]">{inventoryList.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-[2rem] border border-[#ffc9c9] bg-[#fff5f5] p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
          <div className="w-14 h-14 bg-[#ff6b6b] rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <TrendingDown className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest block">Alertes Critiques</span>
            <span className="text-3xl font-black text-[#e03131]">{lowStockProductsCount + lowStockIngredientsCount}</span>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      )}

      {/* Tab Panels */}
      {!loading && activeTab === 'products' && (
        <ProductsTab products={products} onRefresh={loadData} />
      )}

      {!loading && activeTab === 'ingredients' && (
        <IngredientsTab storeId={storeId} inventoryList={inventoryList} onRefresh={loadData} />
      )}

      {!loading && activeTab === 'recipes' && (
        <RecipesTab products={products} globalIngredients={globalIngredients} />
      )}

    </div>
  )
}
