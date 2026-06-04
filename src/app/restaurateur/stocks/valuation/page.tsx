'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  TrendingUp, 
  Search, 
  Loader2, 
  Printer, 
  DollarSign, 
  Layers, 
  PieChart 
} from 'lucide-react';
import { getInventoryValuation } from '@/app/actions/inventoryValuation';
import { CrudTable } from '@/components/ui/ParabellumCrudTable';

type ValuationItem = {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
  costPrice: number;
  sellingPrice: number;
  totalCost: number;
  totalValue: number;
  potentialProfit: number;
};

type CategoryValuation = {
  totalCost: number;
  totalValue: number;
  totalProfit: number;
  count: number;
};

type ValuationSummary = {
  totalCost: number;
  totalValue: number;
  totalProfit: number;
  byCategory: Record<string, CategoryValuation>;
};

export default function ValuationReportPage() {
  const { data: session } = useSession();
  const storeId = session?.user?.storeId;

  const [valuation, setValuation] = useState<ValuationItem[]>([]);
  const [summary, setSummary] = useState<ValuationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getInventoryValuation();
      setValuation(res.valuation);
      setSummary(res.summary);
    } catch (error) {
      console.error('Error loading valuation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      void loadData();
    }
  }, [storeId]);

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = valuation.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const categories = summary ? Object.keys(summary.byCategory) : [];

  return (
    <div className="space-y-8 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:flex-row print:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Évaluation des Stocks</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Valeur financière et bénéfice potentiel en temps réel</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-[#dee2e6] bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-[#495057] transition-all hover:bg-[#f8f9fa] print:hidden self-start"
        >
          <Printer className="w-4 h-4" />
          Imprimer le rapport
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 print:grid-cols-3 print:gap-4">
              <div className="flex items-center gap-5 rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
                <div className="w-14 h-14 bg-[#f8f9fa] rounded-3xl flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-[#adb5bd]" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block">Valeur au Coût</span>
                  <span className="text-2xl font-black text-[#212529]">{summary.totalCost.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              <div className="flex items-center gap-5 rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
                <div className="w-14 h-14 bg-[#f8f9fa] rounded-3xl flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-[#2fbe5f]" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest block">Valeur de Vente</span>
                  <span className="text-2xl font-black text-[#212529]">{summary.totalValue.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              <div className="flex items-center gap-5 rounded-[2rem] border border-[var(--parabellum-primary-light)] bg-[#f3f6ff] p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
                <div className="w-14 h-14 bg-[var(--parabellum-primary)] rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <PieChart className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-[var(--parabellum-primary)] uppercase tracking-widest block">Bénéfice Potentiel</span>
                  <span className="text-2xl font-black text-[var(--parabellum-primary)]">{summary.totalProfit.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters (Hidden during print) */}
          <div className="grid gap-4 sm:grid-cols-2 print:hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#adb5bd]" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#dee2e6] bg-white text-sm font-bold outline-none transition focus:border-[var(--parabellum-primary)]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-[#dee2e6] rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Category Summary Table */}
          {summary && !selectedCategory && (
            <div className="overflow-hidden rounded-xl border border-[#e5e7ef] bg-white shadow-sm print:shadow-none">
              <div className="flex items-center gap-2 border-b border-[#eef0f6] px-6 py-4 bg-[#f8f9fa]">
                <Layers className="w-4 h-4 text-[var(--parabellum-primary)]" />
                <span className="text-xs font-black uppercase tracking-widest text-[#212529]">Résumé par Catégorie</span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#eef0f6] bg-[#f8f9fa] text-[#adb5bd] font-black uppercase tracking-widest">
                    <th className="px-6 py-3">Catégorie</th>
                    <th className="px-6 py-3 text-center">Nombre d&apos;articles</th>
                    <th className="px-6 py-3">Coût Stock</th>
                    <th className="px-6 py-3">Valeur Vente</th>
                    <th className="px-6 py-3">Bénéfice Potentiel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef0f6] font-bold text-[#495057]">
                  {Object.keys(summary.byCategory).map(cat => {
                    const data = summary.byCategory[cat];
                    return (
                      <tr key={cat} className="hover:bg-[#fafbfc]">
                        <td className="px-6 py-3.5">{cat}</td>
                        <td className="px-6 py-3.5 text-center">{data.count}</td>
                        <td className="px-6 py-3.5">{data.totalCost.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-6 py-3.5">{data.totalValue.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-6 py-3.5 text-[var(--parabellum-primary)]">{data.totalProfit.toLocaleString('fr-FR')} FCFA</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Valuation Table */}
          <CrudTable
            title="Détails de l'évaluation par produit"
            rows={filteredItems}
            emptyLabel="Aucun article disponible pour l'évaluation"
            columns={[
              { key: 'name', label: 'Produit' },
              { key: 'category', label: 'Catégorie' },
              { key: 'stock', label: 'Stock' },
              { key: 'costPrice', label: 'Coût Unit.' },
              { key: 'sellingPrice', label: 'Prix Unit.' },
              { key: 'totalCost', label: 'Coût Total' },
              { key: 'totalValue', label: 'Valeur Totale' },
              { key: 'profit', label: 'Bénéfice Potentiel', className: 'text-right' },
            ]}
            renderRow={(item) => (
              <tr key={item.id} className="transition hover:bg-[#fafbfc]">
                <td className="px-6 py-3.5 text-sm font-bold text-[#212529]">{item.name}</td>
                <td className="px-6 py-3.5 text-xs text-[#72788f]">{item.category}</td>
                <td className="px-6 py-3.5 text-xs font-black text-[#495057]">{item.stockQuantity}</td>
                <td className="px-6 py-3.5 text-xs text-[#72788f]">{item.costPrice.toLocaleString('fr-FR')} FCFA</td>
                <td className="px-6 py-3.5 text-xs text-[#72788f]">{item.sellingPrice.toLocaleString('fr-FR')} FCFA</td>
                <td className="px-6 py-3.5 text-xs font-bold text-[#495057]">{item.totalCost.toLocaleString('fr-FR')} FCFA</td>
                <td className="px-6 py-3.5 text-xs font-bold text-[#495057]">{item.totalValue.toLocaleString('fr-FR')} FCFA</td>
                <td className="px-6 py-3.5 text-sm font-black text-[var(--parabellum-primary)] text-right">
                  {item.potentialProfit.toLocaleString('fr-FR')} FCFA
                </td>
              </tr>
            )}
          />
        </>
      )}
    </div>
  );
}
