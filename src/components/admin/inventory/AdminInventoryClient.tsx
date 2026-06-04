'use client'

import React, { useState } from 'react'
import { Archive, Plus, ArrowLeftRight, SlidersHorizontal, Coins } from 'lucide-react'
import { useInventory, InventoryData } from './hooks/useInventory'
import { LevelsTab } from './tabs/LevelsTab'
import { TransfersTab } from './tabs/TransfersTab'
import { AdjustmentsTab } from './tabs/AdjustmentsTab'
import { ValuationTab } from './tabs/ValuationTab'
import { PricingModal } from './modals/PricingModal'
import { AddIngredientModal } from './modals/AddIngredientModal'
import { UpdateInventoryModal } from './modals/UpdateInventoryModal'

interface Props {
  totalIngredients: number
  lowStockCount: number
  inventories: InventoryData[]
  stores: { id: string; name: string }[]
  refreshDataAction: () => void
}

export function AdminInventoryClient({
  totalIngredients,
  lowStockCount,
  inventories,
  stores,
  refreshDataAction
}: Props) {
  const [activeTab, setActiveTab] = useState<'levels' | 'transfers' | 'adjustments' | 'valuation'>('levels')

  const {
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
  } = useInventory({ stores, inventories, refreshDataAction, activeTab })

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">LOGISTIQUE AVANCÉE LOYVERSE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Gestion de l'Inventaire
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Suivi des stocks d'ingrédients, ordres de transfert inter-magasins, ajustements motivés et évaluation financière.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all"
        >
          <Plus className="h-4 w-4" />
          Ajouter Ingrédient
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#E5E7EB] pb-px">
        {[
          { id: 'levels', label: 'Niveaux de Stocks', icon: Archive },
          { id: 'transfers', label: 'Ordres de Transfert', icon: ArrowLeftRight },
          { id: 'adjustments', label: 'Ajustements de Stock', icon: SlidersHorizontal },
          { id: 'valuation', label: 'Évaluation Financière', icon: Coins }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${
                isActive
                  ? 'border-[#FF6D00] text-[#FF6D00]'
                  : 'border-transparent text-[#868e96] hover:text-[#171717]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'levels' && (
        <LevelsTab
          totalIngredients={totalIngredients}
          lowStockCount={lowStockCount}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredInventories={filteredInventories}
          setEditingInventory={setEditingInventory}
          handleDelete={handleDelete}
          isDeleting={isDeleting}
        />
      )}

      {activeTab === 'transfers' && (
        <TransfersTab
          stores={stores}
          transferForm={transferForm}
          setTransferForm={setTransferForm}
          uniqueIngredients={uniqueIngredients}
          isTransferring={isTransferring}
          transferError={transferError}
          transferSuccess={transferSuccess}
          handleTransferSubmit={handleTransferSubmit}
          isLoadingAsync={isLoadingAsync}
          movements={movements}
        />
      )}

      {activeTab === 'adjustments' && (
        <AdjustmentsTab
          stores={stores}
          adjustForm={adjustForm}
          setAdjustForm={setAdjustForm}
          uniqueIngredients={uniqueIngredients}
          isAdjusting={isAdjusting}
          adjustError={adjustError}
          adjustSuccess={adjustSuccess}
          handleAdjustSubmit={handleAdjustSubmit}
          isLoadingAsync={isLoadingAsync}
          movements={movements}
        />
      )}

      {activeTab === 'valuation' && (
        <ValuationTab
          isLoadingAsync={isLoadingAsync}
          valuation={valuation}
          inventories={inventories}
          openPricingModal={openPricingModal}
        />
      )}

      {/* Pricing Modal */}
      <PricingModal
        pricingIngredient={pricingIngredient}
        setPricingIngredient={setPricingIngredient}
        pricingForm={pricingForm}
        setPricingForm={setPricingForm}
        isUpdatingPrices={isUpdatingPrices}
        handlePricesSubmit={handlePricesSubmit}
      />

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddIngredientModal
          stores={stores}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Adjust Modal */}
      {editingInventory && (
        <UpdateInventoryModal
          inventory={editingInventory}
          onClose={() => setEditingInventory(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
