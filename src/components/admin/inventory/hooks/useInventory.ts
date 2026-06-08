'use client'

import { useState, useEffect } from 'react'
import { IngMvtReason } from '@prisma/client'
import { deleteInventory } from '@/app/actions/inventory/inventory'
import { 
  transferStockAction, 
  adjustStockAction, 
  getInventoryValuationReport, 
  getIngredientMovements,
  updateIngredientPrices
} from '@/app/actions/inventory/inventory'

export type InventoryData = {
  id: string
  quantity: number
  minStock: number
  lastUpdated: Date
  ingredient: { id: string; name: string; unit: string; costPrice: number; sellPrice: number }
  store: { name: string }
}

interface UseInventoryProps {
  stores: { id: string; name: string }[]
  inventories: InventoryData[]
  refreshDataAction: () => void
  activeTab: 'levels' | 'transfers' | 'adjustments' | 'valuation'
}

export function useInventory({ stores, inventories, refreshDataAction, activeTab }: UseInventoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingInventory, setEditingInventory] = useState<InventoryData | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Transfers Tab State
  const [transferForm, setTransferForm] = useState({
    sourceStoreId: stores[0]?.id || '',
    destStoreId: stores[1]?.id || '',
    ingredientId: '',
    quantity: '',
    note: ''
  })
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferSuccess, setTransferSuccess] = useState(false)

  // Adjustments Tab State
  const [adjustForm, setAdjustForm] = useState({
    storeId: stores[0]?.id || '',
    ingredientId: '',
    quantity: '',
    type: 'DELTA' as 'SET' | 'DELTA',
    reason: IngMvtReason.ADJUSTMENT_CORRECTION as IngMvtReason,
    note: ''
  })
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState(false)

  // Pricing Modal State
  const [pricingIngredient, setPricingIngredient] = useState<{
    id: string
    name: string
    costPrice: number
    sellPrice: number
  } | null>(null)
  const [pricingForm, setPricingForm] = useState({ costPrice: '', sellPrice: '' })
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false)

  // Async data
  const [movements, setMovements] = useState<any[]>([])
  const [valuation, setValuation] = useState<any>(null)
  const [isLoadingAsync, setIsLoadingAsync] = useState(false)

  // Load movements and valuation depending on active tab
  useEffect(() => {
    if (activeTab === 'transfers' || activeTab === 'adjustments') {
      loadMovementsData()
    } else if (activeTab === 'valuation') {
      loadValuationData()
    }
  }, [activeTab])

  const loadMovementsData = async () => {
    setIsLoadingAsync(true)
    try {
      const data = await getIngredientMovements()
      setMovements(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingAsync(false)
    }
  }

  const loadValuationData = async () => {
    setIsLoadingAsync(true)
    try {
      const data = await getInventoryValuationReport()
      setValuation(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingAsync(false)
    }
  }

  const handleSuccess = () => {
    setIsAddModalOpen(false)
    setEditingInventory(null)
    refreshDataAction()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet ingrédient de l\'inventaire ?')) return
    setIsDeleting(id)
    try {
      const res = await deleteInventory(id)
      if (res.success) {
        refreshDataAction()
      } else {
        alert(res.error || 'Erreur lors de la suppression')
      }
    } catch (e) {
      console.error(e)
      alert('Une erreur est survenue lors de la suppression')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTransferring(true)
    setTransferError('')
    setTransferSuccess(false)

    try {
      const res = await transferStockAction({
        sourceStoreId: transferForm.sourceStoreId,
        destStoreId: transferForm.destStoreId,
        ingredientId: transferForm.ingredientId,
        quantity: parseFloat(transferForm.quantity) || 0,
        note: transferForm.note
      }) as { success: boolean; error?: string }

      if (res.success) {
        setTransferSuccess(true)
        setTransferForm(prev => ({ ...prev, quantity: '', note: '' }))
        loadMovementsData()
        refreshDataAction()
        setTimeout(() => setTransferSuccess(false), 3000)
      } else {
        setTransferError(res.error || "Le transfert a échoué")
      }
    } catch (e) {
      console.error(e)
      setTransferError("Une erreur inattendue est survenue")
    } finally {
      setIsTransferring(false)
    }
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdjusting(true)
    setAdjustError('')
    setAdjustSuccess(false)

    try {
      const res = await adjustStockAction({
        storeId: adjustForm.storeId,
        ingredientId: adjustForm.ingredientId,
        quantity: parseFloat(adjustForm.quantity) || 0,
        type: adjustForm.type,
        reason: adjustForm.reason,
        note: adjustForm.note
      }) as { success: boolean; error?: string }

      if (res.success) {
        setAdjustSuccess(true)
        setAdjustForm(prev => ({ ...prev, quantity: '', note: '' }))
        loadMovementsData()
        refreshDataAction()
        setTimeout(() => setAdjustSuccess(false), 3000)
      } else {
        setAdjustError(res.error || "L'ajustement a échoué")
      }
    } catch (e) {
      console.error(e)
      setAdjustError("Une erreur inattendue est survenue")
    } finally {
      setIsAdjusting(false)
    }
  }

  const handlePricesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pricingIngredient) return
    setIsUpdatingPrices(true)

    try {
      const res = await updateIngredientPrices(
        pricingIngredient.id,
        parseFloat(pricingForm.costPrice) || 0,
        parseFloat(pricingForm.sellPrice) || 0
      )

      if (res.success) {
        setPricingIngredient(null)
        loadValuationData()
        refreshDataAction()
      } else {
        alert(res.error || "Erreur de mise à jour des prix")
      }
    } catch (e) {
      console.error(e)
      alert("Une erreur inattendue est survenue lors de la mise à jour des prix")
    } finally {
      setIsUpdatingPrices(false)
    }
  }

  const openPricingModal = (ing: any) => {
    setPricingIngredient(ing)
    setPricingForm({
      costPrice: ing.costPrice?.toString() || '0',
      sellPrice: ing.sellPrice?.toString() || '0'
    })
  }

  // Filter levels
  const filteredInventories = inventories.filter(item =>
    item.ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.store.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Unique ingredients list for dropdowns
  const uniqueIngredientsMap = new Map()
  inventories.forEach(item => {
    uniqueIngredientsMap.set(item.ingredient.id, item.ingredient)
  })
  const uniqueIngredients = Array.from(uniqueIngredientsMap.values())

  return {
    searchQuery,
    setSearchQuery,
    isAddModalOpen,
    setIsAddModalOpen,
    editingInventory,
    setEditingInventory,
    isDeleting,
    transferForm,
    setTransferForm,
    isTransferring,
    transferError,
    transferSuccess,
    adjustForm,
    setAdjustForm,
    isAdjusting,
    adjustError,
    adjustSuccess,
    pricingIngredient,
    setPricingIngredient,
    pricingForm,
    setPricingForm,
    isUpdatingPrices,
    movements,
    valuation,
    isLoadingAsync,
    filteredInventories,
    uniqueIngredients,
    handleSuccess,
    handleDelete,
    handleTransferSubmit,
    handleAdjustSubmit,
    handlePricesSubmit,
    openPricingModal
  }
}
