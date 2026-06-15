'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  X, 
  ArrowRightLeft, 
  Check, 
  Truck, 
  Building 
} from 'lucide-react';
import { 
  getStores, 
  getTransferOrders, 
  createTransferOrder, 
  shipTransferOrder, 
  receiveTransferOrder 
} from '@/app/actions/inventory/transferOrders';
import { getProductsByStore } from '@/app/actions/catalog/products';
import { CrudTable, CrudStatus, CrudPrimaryButton } from '@/components/ui/ParabellumCrudTable';

type StoreSummary = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  barcode?: string | null;
};

type TransferItem = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  product: Product;
};

type TransferOrder = {
  id: string;
  transferNumber: string;
  fromStoreId: string;
  toStoreId: string;
  status: 'PENDING' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED';
  requestedBy: string;
  approvedBy?: string | null;
  requestDate: Date;
  shipDate?: Date | null;
  receiveDate?: Date | null;
  notes?: string | null;
  fromStore: StoreSummary;
  toStore: StoreSummary;
  items: TransferItem[];
};

export default function TransfersPage() {
  const { data: session } = useSession();
  const storeId = session?.user?.storeId;

  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferOrder | null>(null);

  // New Transfer Form state
  const [transferForm, setTransferForm] = useState({
    toStoreId: '',
    notes: '',
    items: [{ productId: '', quantity: 1 }]
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const [trfs, strs, prods] = await Promise.all([
        getTransferOrders(),
        getStores(),
        getProductsByStore(storeId)
      ]);
      setTransfers(trfs as unknown as TransferOrder[]);
      setStores(strs as StoreSummary[]);
      setProducts(prods as unknown as Product[]);
    } catch (error) {
      console.error('Error loading transfer data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      void loadData();
    }
  }, [storeId]);

  const handleAddItem = () => {
    setTransferForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setTransferForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.toStoreId) return;
    try {
      setSubmitting(true);
      
      const itemsPayload = transferForm.items
        .filter(item => item.productId !== '')
        .map(item => {
          const prod = products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitCost: prod?.costPrice || 0
          };
        });

      await createTransferOrder({
        toStoreId: transferForm.toStoreId,
        notes: transferForm.notes,
        items: itemsPayload
      });

      setShowTransferModal(false);
      setTransferForm({
        toStoreId: '',
        notes: '',
        items: [{ productId: '', quantity: 1 }]
      });
      await loadData();
    } catch (error) {
      console.error('Error creating transfer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShipTransfer = async (transferId: string) => {
    try {
      setActionLoading(transferId);
      await shipTransferOrder(transferId);
      setSelectedTransfer(null);
      await loadData();
    } catch (error) {
      console.error('Error shipping transfer:', error);
      alert(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    try {
      setActionLoading(transferId);
      await receiveTransferOrder(transferId);
      setSelectedTransfer(null);
      await loadData();
    } catch (error) {
      console.error('Error receiving transfer:', error);
      alert(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTransfers = transfers.filter(t => 
    t.transferNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.fromStore.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.toStore.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Transferts de Stock</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Transférez des marchandises entre vos établissements</p>
        </div>
        <CrudPrimaryButton onClick={() => setShowTransferModal(true)}>
          Nouveau Transfert
        </CrudPrimaryButton>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#adb5bd]" />
        <input
          type="text"
          placeholder="Rechercher par N° de transfert ou Boutique..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[#dee2e6] bg-white text-sm font-bold outline-none transition focus:border-[var(--parabellum-primary)]"
        />
      </div>

      {/* Transfers List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <CrudTable
          title="Ordres de transferts inter-magasins"
          rows={filteredTransfers}
          emptyLabel="Aucun ordre de transfert trouvé"
          columns={[
            { key: 'transferNumber', label: 'N° de Transfert' },
            { key: 'fromStore', label: 'Origine' },
            { key: 'toStore', label: 'Destination' },
            { key: 'status', label: 'Statut' },
            { key: 'date', label: 'Date Demande' },
            { key: 'actions', label: 'Actes', className: 'text-right' },
          ]}
          renderRow={(trsf) => (
            <tr key={trsf.id} className="transition hover:bg-[#fafbfc]">
              <td className="px-6 py-4 text-sm font-black text-[var(--parabellum-primary)]">{trsf.transferNumber}</td>
              <td className="px-6 py-4 text-sm font-bold text-[#495057]">
                {trsf.fromStoreId === storeId ? (
                  <span className="text-[#2fbe5f]">Mon Magasin (Expéditeur)</span>
                ) : (
                  trsf.fromStore.name
                )}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-[#495057]">
                {trsf.toStoreId === storeId ? (
                  <span className="text-[var(--parabellum-primary)]">Mon Magasin (Destinataire)</span>
                ) : (
                  trsf.toStore.name
                )}
              </td>
              <td className="px-6 py-4">
                <CrudStatus tone={
                  trsf.status === 'RECEIVED' ? 'success' : 
                  trsf.status === 'SHIPPED' ? 'info' : 'warning'
                }>
                  {trsf.status === 'RECEIVED' ? 'Réceptionné' : 
                   trsf.status === 'SHIPPED' ? 'Expédié' : 'En attente'}
                </CrudStatus>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-[#72788f]">
                {new Date(trsf.requestDate).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => setSelectedTransfer(trsf)}
                  className="rounded-lg bg-[#f1f3f5] px-4 py-2 text-xs font-bold text-[#495057] hover:bg-[#e9ecef] transition-all"
                >
                  Voir Détails
                </button>
              </td>
            </tr>
          )}
        />
      )}

      {/* Transfer Detail Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setSelectedTransfer(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="mb-8">
              <span className="text-[10px] font-black text-[var(--parabellum-primary)] uppercase tracking-widest block mb-1">Détails Transfert</span>
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{selectedTransfer.transferNumber}</h2>
              <div className="mt-2 flex gap-2">
                <CrudStatus tone={
                  selectedTransfer.status === 'RECEIVED' ? 'success' : 
                  selectedTransfer.status === 'SHIPPED' ? 'info' : 'warning'
                }>
                  {selectedTransfer.status === 'RECEIVED' ? 'Réceptionné' : 
                   selectedTransfer.status === 'SHIPPED' ? 'Expédié' : 'En attente'}
                </CrudStatus>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 border-b border-[#eef0f6] pb-6">
              <div>
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Origine</span>
                <span className="text-sm font-bold text-[#495057]">{selectedTransfer.fromStore.name}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Destination</span>
                <span className="text-sm font-bold text-[#495057]">{selectedTransfer.toStore.name}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-black text-[#212529] uppercase tracking-widest">Produits à Transférer</h3>
              <div className="divide-y divide-[#eef0f6] border-y border-[#eef0f6]">
                {selectedTransfer.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-4">
                    <div>
                      <span className="text-sm font-bold text-[#495057]">{item.product.name}</span>
                      <span className="text-xs text-[#adb5bd] block">Quantité : {item.quantity}</span>
                    </div>
                    <span className="text-sm font-black text-[#212529]">
                      {(item.quantity * item.unitCost).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedTransfer(null)}
                className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Fermer
              </button>

              {/* Expédier : si magasin d'origine & statut PENDING */}
              {selectedTransfer.fromStoreId === storeId && selectedTransfer.status === 'PENDING' && (
                <button
                  onClick={() => handleShipTransfer(selectedTransfer.id)}
                  disabled={actionLoading !== null}
                  className="flex-1 py-4 bg-[#ff7a59] hover:bg-[#e86644] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                  Expédier
                </button>
              )}

              {/* Réceptionner : si magasin de destination & statut SHIPPED */}
              {selectedTransfer.toStoreId === storeId && selectedTransfer.status === 'SHIPPED' && (
                <button
                  onClick={() => handleReceiveTransfer(selectedTransfer.id)}
                  disabled={actionLoading !== null}
                  className="flex-1 py-4 bg-[var(--parabellum-primary)] hover:bg-[#253ec7] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Valider Réception
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowTransferModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouveau Transfert</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Créez un transfert de marchandise inter-magasins</p>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Magasin de Destination</label>
                <select 
                  required 
                  value={transferForm.toStoreId} 
                  onChange={e => setTransferForm({...transferForm, toStoreId: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
                >
                  <option value="">Sélectionner boutique</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-[#212529] uppercase tracking-widest">Produits à envoyer</h3>
                  <button 
                    type="button" 
                    onClick={handleAddItem}
                    className="text-xs font-black text-[var(--parabellum-primary)] uppercase tracking-wider flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {transferForm.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[2fr_1fr_auto] gap-3 items-end bg-[#f8f9fa] p-4 rounded-2xl border border-[#eef0f6]">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Produit</label>
                        <select 
                          required
                          value={item.productId}
                          onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full bg-white border border-[#dee2e6] rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
                        >
                          <option value="">Sélectionner</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Quantité</label>
                        <input 
                          required
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value))}
                          className="w-full bg-white border border-[#dee2e6] rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none" 
                        />
                      </div>

                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(idx)}
                        disabled={transferForm.items.length === 1}
                        className="p-2.5 text-[#f72559] hover:bg-[#ffe3ea] rounded-xl transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Notes / Instructions</label>
                <textarea 
                  value={transferForm.notes} 
                  onChange={e => setTransferForm({...transferForm, notes: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" 
                  rows={2}
                  placeholder="EX: Transfert urgent de boissons..."
                />
              </div>

              <button disabled={submitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {submitting ? "Création en cours..." : "Créer le Transfert"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
