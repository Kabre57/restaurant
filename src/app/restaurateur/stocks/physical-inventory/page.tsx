'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  X, 
  Check, 
  AlertCircle, 
  Clipboard, 
  Save 
} from 'lucide-react';
import { 
  getPhysicalInventories, 
  createPhysicalInventory, 
  updatePhysicalCount, 
  completePhysicalInventory 
} from '@/app/actions/physicalInventory';
import { getProductsByStore } from '@/app/actions/products';
import { CrudTable, CrudStatus, CrudPrimaryButton } from '@/components/ui/ParabellumCrudTable';

type Product = {
  id: string;
  name: string;
  stockQuantity: number;
};

type InventoryItem = {
  id: string;
  productId: string;
  expectedQuantity: number;
  countedQuantity?: number | null;
  difference?: number | null;
  notes?: string | null;
  product: Product;
};

type PhysicalInventory = {
  id: string;
  name: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  items: InventoryItem[];
};

export default function PhysicalInventoryPage() {
  const { data: session } = useSession();
  const storeId = session?.user?.storeId;

  const [inventories, setInventories] = useState<PhysicalInventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeInventory, setActiveInventory] = useState<PhysicalInventory | null>(null);

  // New Count Form state
  const [formName, setFormName] = useState('');
  const [formItems, setFormItems] = useState<{ productId: string; expectedQuantity: number }[]>([]);

  // Count Inputs state (for entering quantities)
  const [countedValues, setCountedValues] = useState<Record<string, number>>({});
  const [countedNotes, setCountedNotes] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const [invs, prods] = await Promise.all([
        getPhysicalInventories(),
        getProductsByStore(storeId)
      ]);
      setInventories(invs as unknown as PhysicalInventory[]);
      setProducts(prods as unknown as Product[]);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      void loadData();
    }
  }, [storeId]);

  // When opening active inventory for counting, pre-populate count states
  const handleOpenCount = (inventory: PhysicalInventory) => {
    setActiveInventory(inventory);
    const initialCounts: Record<string, number> = {};
    const initialNotes: Record<string, string> = {};
    inventory.items.forEach(item => {
      initialCounts[item.productId] = item.countedQuantity !== null && item.countedQuantity !== undefined 
        ? item.countedQuantity 
        : item.expectedQuantity;
      initialNotes[item.productId] = item.notes || '';
    });
    setCountedValues(initialCounts);
    setCountedNotes(initialNotes);
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || formItems.length === 0) return;
    try {
      setSubmitting(true);
      await createPhysicalInventory({
        name: formName,
        items: formItems
      });
      setShowCreateModal(false);
      setFormName('');
      setFormItems([]);
      await loadData();
    } catch (error) {
      console.error('Error creating count:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAllProducts = () => {
    setFormItems(products.map(p => ({
      productId: p.id,
      expectedQuantity: p.stockQuantity
    })));
  };

  const handleAddProductItem = (productId: string) => {
    if (formItems.some(item => item.productId === productId)) return;
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setFormItems(prev => [...prev, { productId, expectedQuantity: prod.stockQuantity }]);
    }
  };

  const handleRemoveProductItem = (productId: string) => {
    setFormItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSaveDraftCount = async () => {
    if (!activeInventory) return;
    try {
      setActionLoading('save');
      const payload = Object.keys(countedValues).map(prodId => ({
        productId: prodId,
        countedQuantity: countedValues[prodId],
        notes: countedNotes[prodId] || ''
      }));
      await updatePhysicalCount(activeInventory.id, payload);
      await loadData();
      alert('Inventaire enregistré en brouillon.');
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteCount = async () => {
    if (!activeInventory) return;
    if (!confirm('Confirmer la validation ? Les stocks physiques du système seront mis à jour avec les valeurs saisies.')) return;
    try {
      setActionLoading('complete');
      // Save values first
      const payload = Object.keys(countedValues).map(prodId => ({
        productId: prodId,
        countedQuantity: countedValues[prodId],
        notes: countedNotes[prodId] || ''
      }));
      await updatePhysicalCount(activeInventory.id, payload);
      // Then complete
      await completePhysicalInventory(activeInventory.id);
      setActiveInventory(null);
      await loadData();
    } catch (error) {
      console.error('Error completing inventory:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredInvs = inventories.filter(inv => 
    inv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Inventaire Physique</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Planifiez et réalisez vos comptages physiques</p>
        </div>
        <CrudPrimaryButton onClick={() => setShowCreateModal(true)}>
          Nouvel Inventaire
        </CrudPrimaryButton>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#adb5bd]" />
        <input
          type="text"
          placeholder="Rechercher par nom d'inventaire..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[#dee2e6] bg-white text-sm font-bold outline-none transition focus:border-[var(--parabellum-primary)]"
        />
      </div>

      {/* Counts List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <CrudTable
          title="Sessions de comptage et inventaires physiques"
          rows={filteredInvs}
          emptyLabel="Aucune session d'inventaire trouvée"
          columns={[
            { key: 'name', label: 'Nom Inventaire' },
            { key: 'date', label: 'Créé le' },
            { key: 'completed', label: 'Complété le' },
            { key: 'status', label: 'Statut' },
            { key: 'actions', label: 'Actes', className: 'text-right' },
          ]}
          renderRow={(inv) => (
            <tr key={inv.id} className="transition hover:bg-[#fafbfc]">
              <td className="px-6 py-4 text-sm font-bold text-[#212529]">{inv.name}</td>
              <td className="px-6 py-4 text-sm font-medium text-[#72788f]">
                {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-[#72788f]">
                {inv.completedAt ? new Date(inv.completedAt).toLocaleDateString('fr-FR') : 'En cours'}
              </td>
              <td className="px-6 py-4">
                <CrudStatus tone={inv.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {inv.status === 'COMPLETED' ? 'Validé' : 'Brouillon'}
                </CrudStatus>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => handleOpenCount(inv)}
                  className="rounded-lg bg-[#f1f3f5] px-4 py-2 text-xs font-bold text-[#495057] hover:bg-[#e9ecef] transition-all"
                >
                  {inv.status === 'COMPLETED' ? 'Consulter' : 'Faire le Comptage'}
                </button>
              </td>
            </tr>
          )}
        />
      )}

      {/* Create Inventory Count Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouvel Inventaire Physique</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Créez une session de comptage de stock</p>
            </div>

            <form onSubmit={handleCreateInventory} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom / Description de l&apos;inventaire</label>
                <input 
                  required 
                  type="text" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" 
                  placeholder="EX: INVENTAIRE FIN DU MOIS DE JUIN" 
                />
              </div>

              {/* Selector to choose products */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-[#212529] uppercase tracking-widest">Produits à compter</h3>
                  <button 
                    type="button" 
                    onClick={handleAddAllProducts}
                    className="text-xs font-black text-[var(--parabellum-primary)] uppercase tracking-wider"
                  >
                    Ajouter Tous les Produits
                  </button>
                </div>

                <div className="grid grid-cols-[2fr_auto] gap-3">
                  <select 
                    onChange={e => {
                      if (e.target.value) {
                        handleAddProductItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none"
                  >
                    <option value="">Sélectionner un produit pour l&apos;ajouter</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock actuel: {p.stockQuantity})</option>
                    ))}
                  </select>
                </div>

                {/* Selected Products list */}
                <div className="max-h-48 overflow-y-auto divide-y divide-[#eef0f6] border border-[#dee2e6] rounded-xl bg-white p-2">
                  {formItems.map(item => {
                    const prod = products.find(p => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex justify-between items-center py-2 px-3 text-xs font-bold text-[#495057]">
                        <span>{prod?.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[#adb5bd]">Stock système: {item.expectedQuantity}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveProductItem(item.productId)}
                            className="text-[#f72559] hover:bg-[#ffe3ea] p-1.5 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {formItems.length === 0 && (
                    <p className="text-center text-xs text-[#adb5bd] py-6 font-medium">Aucun produit sélectionné</p>
                  )}
                </div>
              </div>

              <button disabled={submitting || formItems.length === 0} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {submitting ? "Création en cours..." : "Lancer l&apos;Inventaire"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Perform Count Sheet / Modal */}
      {activeInventory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setActiveInventory(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="mb-6">
              <span className="text-[10px] font-black text-[var(--parabellum-primary)] uppercase tracking-widest block mb-1">Session de Comptage</span>
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{activeInventory.name}</h2>
              <div className="mt-2 flex gap-2">
                <CrudStatus tone={activeInventory.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {activeInventory.status === 'COMPLETED' ? 'Validé (Clôturé)' : 'Brouillon (En cours)'}
                </CrudStatus>
              </div>
            </div>

            {/* List of items to count */}
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-3 px-4 text-[10px] font-black text-[#adb5bd] uppercase tracking-widest border-b border-[#dee2e6] pb-2">
                <span>Produit</span>
                <span className="text-center">Stock Estimé</span>
                <span className="text-center">Stock Réel</span>
                <span>Note d&apos;écart</span>
              </div>

              <div className="divide-y divide-[#eef0f6] max-h-60 overflow-y-auto pr-1">
                {activeInventory.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-3 items-center py-3 text-xs font-bold text-[#495057]">
                    <span>{item.product.name}</span>
                    <span className="text-center text-[#72788f]">{item.expectedQuantity}</span>
                    <div>
                      {activeInventory.status === 'COMPLETED' ? (
                        <span className="block text-center font-black text-[#212529]">{item.countedQuantity}</span>
                      ) : (
                        <input
                          type="number"
                          value={countedValues[item.productId] ?? ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            setCountedValues(prev => ({ ...prev, [item.productId]: isNaN(val) ? 0 : val }));
                          }}
                          className="w-full text-center border border-[#dee2e6] bg-[#f8f9fa] rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#212529]"
                        />
                      )}
                    </div>
                    <div>
                      {activeInventory.status === 'COMPLETED' ? (
                        <span className="text-xs text-[#72788f]">{item.notes || '-'}</span>
                      ) : (
                        <input
                          type="text"
                          value={countedNotes[item.productId] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setCountedNotes(prev => ({ ...prev, [item.productId]: val }));
                          }}
                          placeholder="EX: Perte ou casse..."
                          className="w-full border border-[#dee2e6] bg-[#f8f9fa] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setActiveInventory(null)}
                className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Fermer
              </button>

              {activeInventory.status !== 'COMPLETED' && (
                <>
                  <button
                    onClick={handleSaveDraftCount}
                    disabled={actionLoading !== null}
                    className="flex-1 py-4 bg-[#f1f3f5] hover:bg-[#e9ecef] text-[#495057] rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Sauvegarder
                  </button>
                  <button
                    onClick={handleCompleteCount}
                    disabled={actionLoading !== null}
                    className="flex-1 py-4 bg-[var(--parabellum-primary)] hover:bg-[#253ec7] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'complete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Valider l&apos;Inventaire
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
