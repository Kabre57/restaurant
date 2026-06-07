'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Save, Store, MapPin, Phone, Loader2, CheckCircle2, QrCode, UtensilsCrossed, Coins, FileText, Printer, Sliders } from 'lucide-react'
import { getStoreDetails } from '@/app/actions/stores'
import { updateStoreConfig } from '@/app/actions/storeConfig'
import { useSession } from 'next-auth/react'
import { optimizeImageFile } from '@/lib/client-image'

type StoreConfigData = {
  name: string
  address: string | null
  phone?: string | null
  logo?: string | null
}

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
    const storeId = session?.user?.storeId
    if (!storeId) return
    const activeStoreId = storeId

    let isCancelled = false

    async function fetchConfig() {
      setLoading(true)
      const data = await getStoreDetails(activeStoreId) as StoreConfigData | null
      if (isCancelled) return

      if (data) {
        setFormData({
          name: data.name,
          address: data.address || '',
          phone: data.phone || '',
          logo: data.logo || ''
        })
      }

      setLoading(false)
    }

    void fetchConfig()

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

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

  async function handleLogoSelection(file?: File | null) {
    if (!file) return

    try {
      const optimizedLogo = await optimizeImageFile(file, { maxDimension: 960, maxOutputBytes: 700 * 1024 })
      setFormData((current) => ({ ...current, logo: optimizedLogo }))
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible de traiter cette image.")
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#212529] uppercase sm:text-3xl">Réglages Restaurant</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Configurez l&apos;identité et les coordonnées de votre établissement</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#adb5bd]" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-8 rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">Nom de l&apos;établissement</label>
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
                  <div className="relative w-full h-full p-2 flex items-center justify-center">
                    <Image src={formData.logo} alt="Logo" fill unoptimized className="rounded-xl object-contain" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer le logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#adb5bd]">
                    <Store className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest">PNG, JPG, WEBP optimises auto</span>
                  </div>
                )}
                <input 
                  id="logo-upload"
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    await handleLogoSelection(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Configuration Carte/Menu</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#adb5bd]">
                  Le manager prépare la carte, puis associe chaque étiquette ou tablette à une table.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/restaurateur/produits"
                className="flex items-center gap-3 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <UtensilsCrossed className="h-5 w-5 text-brand-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">Configurer les plats, boissons et formules</span>
              </Link>
              <Link
                href="/restaurateur/tables"
                className="flex items-center gap-3 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <QrCode className="h-5 w-5 text-brand-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">Générer les liens Carte/Menu par table</span>
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[#212529]">Caisse & Paiements</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#adb5bd]">
                  Gérez les règles de caisse, d&apos;arrondis et de facturation pour vos terminaux de vente.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/restaurateur/config/arrondis"
                className="flex items-center gap-3 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <Coins className="h-5 w-5 text-brand-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">Configurer les arrondis de caisse (FCFA)</span>
              </Link>
              <Link
                href="/restaurateur/config/recus"
                className="flex items-center gap-3 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <FileText className="h-5 w-5 text-brand-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">Personnaliser les reçus (Logo & Textes)</span>
              </Link>
              <Link
                href="/restaurateur/config/workflow"
                className="flex items-center gap-3 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <Sliders className="h-5 w-5 text-brand-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">Workflow de Commande (Standard vs Direct)</span>
              </Link>
              <Link
                href="/restaurateur/config/materiel"
                className="flex items-center gap-3 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <Printer className="h-5 w-5 text-brand-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#212529]">Gérer le matériel & imprimantes (ESC/POS)</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl bg-[#212529] p-5 text-white shadow-xl shadow-[#212529]/20 sm:flex-row sm:items-center sm:justify-between sm:p-6">
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
            <button disabled={isSaving} type="submit" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-[#212529] transition-all hover:bg-[#f1f3f5] disabled:opacity-50 sm:w-auto sm:px-10">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
