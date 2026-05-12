'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Save, Store, MapPin, Phone, Loader2, CheckCircle2 } from 'lucide-react'
import { getStoreDetails } from '@/app/actions/stores'
import { updateStoreConfig } from '@/app/actions/storeConfig'
import { useSession } from 'next-auth/react'

export default function RestaurateurConfig() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    logo: ''
  })

  useEffect(() => {
    if (session?.user?.storeId) {
      loadConfig()
    }
  }, [session])

  async function loadConfig() {
    setLoading(true)
    const data = await getStoreDetails(session?.user?.storeId as string)
    if (data) {
      setFormData({
        name: data.name,
        address: data.address || '',
        phone: (data as any).phone || '',
        logo: (data as any).logo || ''
      })
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setMessage('')
    
    const res = await updateStoreConfig(session?.user?.storeId as string, formData)

    if (res.success) {
      setMessage('Configuration enregistrée avec succès !')
      setTimeout(() => setMessage(''), 3001)
    } else {
      alert(res.error)
    }
    setIsSaving(false)
  }

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Réglages Restaurant</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Configurez l'identité et les coordonnées de votre établissement</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-[#dee2e6] shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom de l'établissement</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Téléphone de contact</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adb5bd]" />
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Adresse physique</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-4 h-4 text-[#adb5bd]" />
                <textarea required rows={3} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all" placeholder="EX: Rue des Jardins, Cocody, Abidjan" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Logo du Restaurant</label>
              <div 
                onClick={() => document.getElementById('logo-upload')?.click()}
                className={`relative h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.logo ? 'border-[#2f9e44] bg-[#ebfbee]' : 'border-[#dee2e6] hover:border-[#212529] bg-[#f8f9fa]'}`}
              >
                {formData.logo ? (
                  <div className="relative w-full h-full p-2 flex justify-center">
                    <img src={formData.logo} alt="Logo" className="h-full object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer le logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#adb5bd]">
                    <Store className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cliquez pour uploader</span>
                  </div>
                )}
                <input 
                  id="logo-upload"
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => setFormData({...formData, logo: reader.result as string})
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#212529] p-6 rounded-3xl text-white shadow-xl shadow-[#212529]/20">
            <div className="flex items-center gap-3">
              {message ? (
                <div className="flex items-center gap-2 text-[#51cf66]">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Modifications non enregistrées</p>
              )}
            </div>
            <button disabled={isSaving} type="submit" className="bg-white text-[#212529] px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#f1f3f5] transition-all flex items-center gap-3 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
