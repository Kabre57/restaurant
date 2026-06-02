'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Trash2, X, ChefHat, MinusCircle, Tag } from 'lucide-react'

interface Category {
  id: string
  name: string
  storeId: string
  store: { name: string }
}

interface Store {
  id: string
  name: string
}

// Local state management for options (persisted in DB via migration later)
type OptionType = 'SUPPLEMENT' | 'REMOVAL'

interface Option {
  id: string
  name: string
  price: number
  type: OptionType
  categoryId: string | null
  categoryName?: string
}

// Predefined default options that match the customer menu logic
const DEFAULT_OPTIONS: Option[] = [
  { id: 'd1', name: 'Cheddar supplémentaire', price: 1.00, type: 'SUPPLEMENT', categoryId: null, categoryName: 'Burgers' },
  { id: 'd2', name: 'Bacon croustillant', price: 1.50, type: 'SUPPLEMENT', categoryId: null, categoryName: 'Burgers' },
  { id: 'd3', name: 'Sauce piquante à part', price: 0.50, type: 'SUPPLEMENT', categoryId: null, categoryName: 'Burgers' },
  { id: 'd4', name: 'Sans Oignon', price: 0, type: 'REMOVAL', categoryId: null, categoryName: 'Burgers' },
  { id: 'd5', name: 'Sans tomate', price: 0, type: 'REMOVAL', categoryId: null, categoryName: 'Burgers' },
  { id: 'd6', name: 'Sans sauce', price: 0, type: 'REMOVAL', categoryId: null, categoryName: 'Burgers' },
  { id: 'd7', name: 'Cheddar fondu', price: 1.00, type: 'SUPPLEMENT', categoryId: null, categoryName: 'Accompagnements' },
  { id: 'd8', name: 'Oignons frits', price: 0.50, type: 'SUPPLEMENT', categoryId: null, categoryName: 'Accompagnements' },
  { id: 'd9', name: 'Sans sel', price: 0, type: 'REMOVAL', categoryId: null, categoryName: 'Accompagnements' },
  { id: 'd10', name: 'Coulis de chocolat', price: 0.50, type: 'SUPPLEMENT', categoryId: null, categoryName: 'Desserts' },
  { id: 'd11', name: 'Chantilly', price: 0.50, type: 'SUPPLEMENT', categoryId: null, categoryName: 'Desserts' },
]

interface Props {
  categories: Category[]
  stores: Store[]
}

export default function AdminSupplementsClient({ categories, stores: _stores }: Props) {
  const [options, setOptions] = useState<Option[]>(DEFAULT_OPTIONS)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<OptionType | 'ALL'>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  // Form state
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('0')
  const [formType, setFormType] = useState<OptionType>('SUPPLEMENT')
  const [formCategoryName, setFormCategoryName] = useState('')
  const [formError, setFormError] = useState('')
  const [_isPending, startTransition] = useTransition()

  const handleAdd = () => {
    if (!formName.trim()) { setFormError('Le nom est requis.'); return }
    const price = parseFloat(formPrice) || 0
    const newOpt: Option = {
      id: `local-F CFA {Date.now()}`,
      name: formName.trim(),
      price,
      type: formType,
      categoryId: null,
      categoryName: formCategoryName || 'Tous',
    }
    startTransition(() => {
      setOptions((prev) => [...prev, newOpt])
      setShowForm(false)
      setFormName('')
      setFormPrice('0')
      setFormCategoryName('')
      setFormError('')
    })
  }

  const handleDelete = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  const filtered = options.filter((opt) => {
    const matchType = filterType === 'ALL' || opt.type === filterType
    const matchCat = filterCategory === 'ALL' || opt.categoryName === filterCategory
    return matchType && matchCat
  })

  const allCategoryNames = [...new Set(options.map((o) => o.categoryName || 'Tous'))]

  const supplementCount = options.filter((o) => o.type === 'SUPPLEMENT').length
  const removalCount = options.filter((o) => o.type === 'REMOVAL').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">PERSONNALISATION CLIENT</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Suppléments & Ingrédients
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#868e96]">
            Gérez les options de personnalisation affichées sur le menu client QR. Ces options s&apos;appliquent par catégorie de produit.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#FF6D00] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all"
        >
          <Plus className="h-4 w-4" />
          Nouvelle option
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Options totales</span>
            <div className="rounded-xl bg-[#FF6D00]/10 p-2.5 text-[#FF6D00]"><Tag className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 text-2xl font-black text-black">{options.length}</div>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Suppléments</span>
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-600"><ChefHat className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 text-2xl font-black text-green-600">{supplementCount}</div>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#868e96]">Retraits</span>
            <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500"><MinusCircle className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 text-2xl font-black text-red-500">{removalCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {(['ALL', 'SUPPLEMENT', 'REMOVAL'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-xl border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all F CFA {
              filterType === t
                ? 'bg-[#FF6D00] text-white border-transparent shadow-md shadow-orange-500/10'
                : 'bg-white text-[#868e96] border-[#E5E7EB] hover:border-[#FF6D00]'
            }`}
          >
            {t === 'ALL' ? 'Tous' : t === 'SUPPLEMENT' ? 'Suppléments' : 'Retraits'}
          </button>
        ))}
        <div className="h-6 w-px bg-[#E5E7EB]" />
        {['ALL', ...allCategoryNames].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`rounded-xl border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all F CFA {
              filterCategory === cat
                ? 'bg-[#171717] text-white border-transparent'
                : 'bg-white text-[#868e96] border-[#E5E7EB] hover:border-[#171717]'
            }`}
          >
            {cat === 'ALL' ? 'Toutes catégories' : cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 border-b border-[#F1F3F5] px-6 py-3 bg-[#F8F9FA]">
          <span className="text-[8px] font-black uppercase tracking-widest text-[#868e96]">Type</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-[#868e96] pl-4">Nom de l&apos;option</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-[#868e96] text-right pr-8">Prix</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-[#868e96] text-right pr-8">Catégorie</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-[#868e96]">Action</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-[#868e96]">Aucune option trouvée</p>
          </div>
        ) : (
          <div>
            {filtered.map((opt) => (
              <div
                key={opt.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-0 border-b border-[#F8F9FA] px-6 py-4 last:border-0 hover:bg-[#F8F9FA] transition-colors"
              >
                {/* Type badge */}
                <div>
                  {opt.type === 'SUPPLEMENT' ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-green-700">
                      <ChefHat className="h-2.5 w-2.5" />
                      Supplément
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-red-700">
                      <MinusCircle className="h-2.5 w-2.5" />
                      Retrait
                    </span>
                  )}
                </div>

                {/* Name */}
                <span className="pl-4 text-xs font-black text-[#171717]">{opt.name}</span>

                {/* Price */}
                <span className="pr-8 text-right text-xs font-black text-[#FF6D00]">
                  {opt.price > 0 ? `+ F CFA {opt.price.toFixed(2)} F CFA ` : '—'}
                </span>

                {/* Category */}
                <span className="pr-8 text-right text-[9px] font-bold text-[#868e96]">
                  {opt.categoryName || 'Tous'}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(opt.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[#adb5bd] hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add option modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#171717]">Nouvelle option</h2>
              <button onClick={() => { setShowForm(false); setFormError('') }} className="text-[#adb5bd] hover:text-[#495057]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Type */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">Type</label>
                <div className="flex gap-3">
                  {(['SUPPLEMENT', 'REMOVAL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormType(t)}
                      className={`flex-1 rounded-xl border py-3 text-[9px] font-black uppercase tracking-widest transition-all F CFA {
                        formType === t
                          ? t === 'SUPPLEMENT'
                            ? 'bg-green-500 text-white border-transparent'
                            : 'bg-red-500 text-white border-transparent'
                          : 'bg-white text-[#868e96] border-[#E5E7EB]'
                      }`}
                    >
                      {t === 'SUPPLEMENT' ? '+ Supplément' : '− Retrait'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">Nom</label>
                <input
                  type="text"
                  placeholder={formType === 'SUPPLEMENT' ? 'Ex : Bacon croustillant' : 'Ex : Sans oignon'}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 px-4 text-xs font-bold text-[#212529] outline-none focus:border-[#FF6D00]"
                />
              </div>

              {/* Price (supplements only) */}
              {formType === 'SUPPLEMENT' && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">Prix additionnel (F CFA )</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Ex : 1.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 px-4 text-xs font-bold text-[#212529] outline-none focus:border-[#FF6D00]"
                  />
                </div>
              )}

              {/* Category (text for now) */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">Catégorie de produit</label>
                <select
                  value={formCategoryName}
                  onChange={(e) => setFormCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 px-4 text-xs font-bold text-[#212529] outline-none focus:border-[#FF6D00]"
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name} — {cat.store.name}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[10px] font-black text-red-600">{formError}</p>
              )}
            </div>

            <div className="border-t border-[#E5E7EB] flex gap-3 px-6 py-4">
              <button
                onClick={() => { setShowForm(false); setFormError('') }}
                className="flex-1 rounded-xl border border-[#E5E7EB] py-3 text-[9px] font-black uppercase tracking-widest text-[#868e96] hover:bg-[#F8F9FA] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 rounded-xl bg-[#FF6D00] py-3 text-[9px] font-black uppercase tracking-widest text-white hover:bg-[#E66200] transition-all"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
