'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  X, 
  ClipboardList, 
  FileText, 
  Check, 
  Calendar, 
  DollarSign, 
  UserPlus 
} from 'lucide-react';
import { 
  getSuppliers, 
  createSupplier, 
  getPurchaseOrders, 
  createPurchaseOrder, 
  receivePurchaseOrder 
} from '@/app/actions/purchaseOrders';
import { getProductsByStore } from '@/app/actions/products';
import { CrudTable, CrudStatus, CrudPrimaryButton } from '@/components/ui/ParabellumCrudTable';

type Supplier = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  barcode?: string | null;
};

type POItem = {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  product: Product;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  orderDate: Date;
  expectedDate?: Date | null;
  receivedDate?: Date | null;
  notes?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  supplier: Supplier;
  items: POItem[];
};

export default function PurchaseOrdersPage() {
  const { data: session } = useSession();
  const storeId = session?.user?.storeId;

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // New PO Form state
  const [poForm, setPOForm] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
    items: [{ productId: '', quantity: 1, unitCost: 0 }]
  });

  // New Supplier Form state
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactName: '',
    taxId: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const [pos, sups, prods] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProductsByStore(storeId)
      ]);
      setPurchaseOrders(pos as unknown as PurchaseOrder[]);
      setSuppliers(sups as Supplier[]);
      setProducts(prods as unknown as Product[]);
    } catch (error) {
      console.error('Error loading PO data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      void loadData();
    }
  }, [storeId]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const newSup = await createSupplier(supplierForm);
      setSuppliers(prev => [...prev, newSup]);
      setPOForm(prev => ({ ...prev, supplierId: newSup.id }));
      setShowSupplierModal(false);
      setSupplierForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactName: '',
        taxId: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    setPOForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitCost: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setPOForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setPOForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplierId) return;
    try {
      setSubmitting(true);
      const payload = {
        supplierId: poForm.supplierId,
        expectedDate: poForm.expectedDate ? new Date(poForm.expectedDate) : undefined,
        notes: poForm.notes,
        items: poForm.items.filter(item => item.productId !== '')
      };
      await createPurchaseOrder(payload);
      setShowPOModal(false);
      setPOForm({
        supplierId: '',
        expectedDate: '',
        notes: '',
        items: [{ productId: '', quantity: 1, unitCost: 0 }]
      });
      await loadData();
    } catch (error) {
      console.error('Error creating PO:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePO = async (poId: string) => {
    try {
      setActionLoading(poId);
      await receivePurchaseOrder(poId);
      setSelectedPO(null);
      await loadData();
    } catch (error) {
      console.error('Error receiving PO:', error);
      alert(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPOs = purchaseOrders.filter(po => 
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Bons de Commande</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Gérez vos approvisionnements fournisseurs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-2 rounded-lg border border-[#dee2e6] bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-[#495057] transition-all hover:bg-[#f8f9fa]"
          >
            <UserPlus className="w-4 h-4" />
            Nouveau Fournisseur
          </button>
          <CrudPrimaryButton onClick={() => setShowPOModal(true)}>
            Nouveau Bon de Commande
          </CrudPrimaryButton>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#adb5bd]" />
        <input
          type="text"
          placeholder="Rechercher par N° de commande ou Fournisseur..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[#dee2e6] bg-white text-sm font-bold outline-none transition focus:border-[var(--parabellum-primary)]"
        />
      </div>

      {/* POs List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <CrudTable
          title="Commandes d'approvisionnement"
          rows={filteredPOs}
          emptyLabel="Aucun bon de commande trouvé"
          columns={[
            { key: 'poNumber', label: 'N° de Commande' },
            { key: 'supplier', label: 'Fournisseur' },
            { key: 'date', label: 'Date Commande' },
            { key: 'total', label: 'Total TTC' },
            { key: 'status', label: 'Statut' },
            { key: 'actions', label: 'Actes', className: 'text-right' },
          ]}
          renderRow={(po) => (
            <tr key={po.id} className="transition hover:bg-[#fafbfc]">
              <td className="px-6 py-4 text-sm font-black text-[var(--parabellum-primary)]">{po.poNumber}</td>
              <td className="px-6 py-4 text-sm font-bold text-[#495057]">{po.supplier.name}</td>
              <td className="px-6 py-4 text-sm font-medium text-[#72788f]">
                {new Date(po.orderDate).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-6 py-4 text-sm font-black text-[#212529]">
                {po.totalAmount.toLocaleString('fr-FR')} FCFA
              </td>
              <td className="px-6 py-4">
                <CrudStatus tone={po.status === 'RECEIVED' ? 'success' : 'warning'}>
                  {po.status === 'RECEIVED' ? 'Réceptionné' : 'En attente'}
                </CrudStatus>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => setSelectedPO(po)}
                  className="rounded-lg bg-[#f1f3f5] px-4 py-2 text-xs font-bold text-[#495057] hover:bg-[#e9ecef] transition-all"
                >
                  Voir Détails
                </button>
              </td>
            </tr>
          )}
        />
      )}

      {/* PO Detail Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setSelectedPO(null)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="mb-8">
              <span className="text-[10px] font-black text-[var(--parabellum-primary)] uppercase tracking-widest block mb-1">Détails Commande</span>
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">{selectedPO.poNumber}</h2>
              <div className="mt-2 flex gap-2">
                <CrudStatus tone={selectedPO.status === 'RECEIVED' ? 'success' : 'warning'}>
                  {selectedPO.status === 'RECEIVED' ? 'Réceptionné' : 'En attente'}
                </CrudStatus>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 border-b border-[#eef0f6] pb-6">
              <div>
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Fournisseur</span>
                <span className="text-sm font-bold text-[#495057]">{selectedPO.supplier.name}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest block">Date Estimée</span>
                <span className="text-sm font-bold text-[#495057]">
                  {selectedPO.expectedDate ? new Date(selectedPO.expectedDate).toLocaleDateString('fr-FR') : 'Non planifiée'}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-black text-[#212529] uppercase tracking-widest">Produits Commandés</h3>
              <div className="divide-y divide-[#eef0f6] border-y border-[#eef0f6]">
                {selectedPO.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-4">
                    <div>
                      <span className="text-sm font-bold text-[#495057]">{item.product.name}</span>
                      <span className="text-xs text-[#adb5bd] block">{item.quantity} x {item.unitCost.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <span className="text-sm font-black text-[#212529]">{item.totalCost.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#f8f9fa] rounded-2xl p-6 space-y-3 mb-8">
              <div className="flex justify-between text-xs font-bold text-[#72788f]">
                <span>Sous-total</span>
                <span>{selectedPO.subtotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-[#72788f]">
                <span>TVA (18%)</span>
                <span>{selectedPO.taxAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#212529] border-t border-[#dee2e6] pt-3">
                <span>Total TTC</span>
                <span>{selectedPO.totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedPO(null)}
                className="flex-1 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Fermer
              </button>
              {selectedPO.status !== 'RECEIVED' && (
                <button
                  onClick={() => handleReceivePO(selectedPO.id)}
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

      {/* Create Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowSupplierModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouveau Fournisseur</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Créez un fournisseur pour l&apos;approvisionnement</p>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom du Fournisseur</label>
                <input required type="text" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="EX: GROUPE SIFCA" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Email</label>
                  <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="contact@sifca.ci" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Téléphone</label>
                  <input type="text" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="+225 0707..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Contact Principal</label>
                  <input type="text" value={supplierForm.contactName} onChange={e => setSupplierForm({...supplierForm, contactName: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="Mr. Jean Konan" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Compte contribuable (Réf)</label>
                  <input type="text" value={supplierForm.taxId} onChange={e => setSupplierForm({...supplierForm, taxId: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" placeholder="NCC 1234567..." />
                </div>
              </div>

              <button disabled={submitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {submitting ? "Enregistrement..." : "Créer le Fournisseur"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#212529]/60 p-4 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem] sm:p-10">
            <button onClick={() => setShowPOModal(false)} className="absolute top-4 right-4 p-2 text-[#adb5bd] hover:text-[#212529] sm:top-6 sm:right-6"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#212529] uppercase tracking-tight">Nouveau Bon de Commande</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Créez un bon d&apos;approvisionnement fournisseur</p>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Fournisseur</label>
                  <select 
                    required 
                    value={poForm.supplierId} 
                    onChange={e => setPOForm({...poForm, supplierId: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]"
                  >
                    <option value="">Sélectionner</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Date estimée de réception</label>
                  <input 
                    type="date" 
                    value={poForm.expectedDate} 
                    onChange={e => setPOForm({...poForm, expectedDate: e.target.value})}
                    className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" 
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-[#212529] uppercase tracking-widest">Produits & Prix d&apos;achat</h3>
                  <button 
                    type="button" 
                    onClick={handleAddItem}
                    className="text-xs font-black text-[var(--parabellum-primary)] uppercase tracking-wider flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-end bg-[#f8f9fa] p-4 rounded-2xl border border-[#eef0f6]">
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

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[#adb5bd] uppercase tracking-widest">Coût Unitaire (FCFA)</label>
                        <input 
                          required
                          type="number" 
                          min="0"
                          value={item.unitCost}
                          onChange={e => handleItemChange(idx, 'unitCost', parseFloat(e.target.value))}
                          className="w-full bg-white border border-[#dee2e6] rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none" 
                        />
                      </div>

                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(idx)}
                        disabled={poForm.items.length === 1}
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
                  value={poForm.notes} 
                  onChange={e => setPOForm({...poForm, notes: e.target.value})}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529]" 
                  rows={2}
                  placeholder="EX: Livraison au quai de déchargement..."
                />
              </div>

              <button disabled={submitting} type="submit" className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:bg-[#adb5bd]">
                {submitting ? "Création en cours..." : "Créer le Bon de Commande"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
