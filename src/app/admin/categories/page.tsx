'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Search, Image as ImageIcon, Layers, Upload, X } from 'lucide-react'

export default function AdminCategories() {
  const [categories, setCategories] = useState([
    { id: '1', name: 'Plats Africains', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80', count: 12 },
    { id: '2', name: 'Plats Caribéens', image: 'https://images.unsplash.com/photo-1599481238640-4c1288750d7a?w=200&q=80', count: 8 },
    { id: '3', name: 'Grillades', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&q=80', count: 15 },
    { id: '4', name: 'Desserts', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=200&q=80', count: 6 },
    { id: '5', name: 'Boissons', image: 'https://images.unsplash.com/photo-1544145945-f904253db0ad?w=200&q=80', count: 20 },
  ])

  const [showAddModal, setShowAddModal] = useState(false)
  const [newCatName, setNewCatName] = useState("")

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight">Gestion des Catégories</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Configurez les types de plats disponibles sur la plateforme</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#212529] hover:bg-black text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#212529]/20"
        >
          <Plus className="w-5 h-5" />
          Créer une Catégorie
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-[2rem] border border-[#dee2e6] overflow-hidden group hover:shadow-2xl transition-all">
            <div className="h-40 bg-[#f1f3f5] relative overflow-hidden">
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
              <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-[#e03131] transition-all opacity-0 group-hover:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-black text-[#212529] uppercase tracking-tight mb-1">{cat.name}</h3>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest">{cat.count} Plats rattachés</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#212529]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 text-[#adb5bd] hover:text-[#212529]"><X className="w-6 h-6" /></button>
            
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-[#f1f3f5] rounded-2xl flex items-center justify-center mb-4">
                <Layers className="w-8 h-8 text-[#212529]" />
              </div>
              <h2 className="text-xl font-black text-[#212529] uppercase tracking-tight">Nouvelle Catégorie</h2>
              <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Ajoutez un nouvel axe culinaire</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom de la catégorie</label>
                <input 
                  type="text" 
                  placeholder="EX: GRILLADES" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Image (S3 Cloud Storage)</label>
                <div className="border-2 border-dashed border-[#dee2e6] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[#212529] transition-all cursor-pointer bg-[#f8f9fa]">
                  <Upload className="w-6 h-6 text-[#adb5bd]" />
                  <span className="text-[10px] font-black text-[#adb5bd] uppercase">Cliquez pour uploader</span>
                </div>
              </div>

              <button className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-[#212529]/20">
                Enregistrer la Catégorie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
