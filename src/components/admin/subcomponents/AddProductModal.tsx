'use client'

import React, { useState, useRef } from 'react'
import { X, Upload, Check, Loader2 } from 'lucide-react'
import { addProduct } from '@/app/actions/analytics/admin'
import Image from 'next/image'

type Category = { id: string, name: string, imageUrl?: string | null }
type NewProduct = {
  id: string
  name: string
  price: number
  isAvailable: boolean
  image: string | null
  category: Category
  categoryId: string
  averagePrepTimeMins: number | null
}

interface Props {
  categories: Category[]
  onClose: () => void
  onSuccess: (newProduct: NewProduct) => void
  storeId: string
}

export function AddProductModal({ categories, onClose, onSuccess, storeId }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [barcode, setBarcode] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImage(reader.result as string)
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price || !categoryId) return

    setIsSubmitting(true)
    const res = await addProduct({
      name,
      price: parseFloat(price),
      categoryId,
      image,
      storeId,
      averagePrepTimeMins: prepTime ? parseInt(prepTime) : undefined,
      barcode: barcode || null
    })

    if (res.success && res.product) {
      onSuccess(res.product as unknown as NewProduct)
      onClose()
    } else {
      alert(res.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-8 border-b border-[#f1f3f5] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-[#212529] uppercase tracking-tighter">Nouveau Produit</h2>
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mt-1">Ajoutez un plat à votre carte</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f8f9fa] rounded-full transition-all">
            <X className="w-6 h-6 text-[#adb5bd]" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Nom du Produit</label>
            <input 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all"
              placeholder="Ex: Burger Spécial Chef"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Prix (FCFA)</label>
              <input 
                required
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all"
                placeholder="4500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Temps prépa. (min)</label>
              <input 
                type="number"
                value={prepTime}
                onChange={e => setPrepTime(e.target.value)}
                className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all"
                placeholder="Ex: 15"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Catégorie</label>
            <select 
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all appearance-none"
            >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Code-barres (facultatif)</label>
            <input 
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all"
              placeholder="Ex: 3017620422003"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Image du Produit</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${image ? 'border-[#2f9e44] bg-[#ebfbee]' : 'border-[#dee2e6] hover:border-[#212529] bg-[#f8f9fa]'}`}
            >
              {image ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  <div className="relative w-full h-full rounded-xl bg-white/90 border border-white/80 shadow-[0_18px_40px_rgba(33,37,41,0.08)] overflow-hidden">
                    <Image src={image} alt="Preview" fill className="object-contain p-3 rounded-xl" />
                  </div>
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer l&apos;image</span>
                  </div>
                </div>
              ) : isUploading ? (
                <Loader2 className="w-8 h-8 text-[#212529] animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-[#adb5bd]" />
                  <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Cliquez pour uploader</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#212529] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer le Produit
          </button>
        </form>
      </div>
    </div>
  )
}
