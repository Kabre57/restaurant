'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { FileText, Check, Upload, Trash2, Printer, AlertTriangle } from 'lucide-react'
import { getStoreSettings, updateStoreSettings } from '@/app/actions/store/storeSettings'

export default function ReceiptSettingsPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [logo, setLogo] = useState<string | null>(null)
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  
  const [monochromePreview, setMonochromePreview] = useState<string | null>(null)
  const [logoSizeKb, setLogoSizeKb] = useState<number>(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Chargement initial ───────────────────────────────────────────
  useEffect(() => {
    if (!storeId) return

    const load = async () => {
      setIsLoading(true)
      const result = await getStoreSettings(storeId)
      if (result.success && result.settings) {
        setHeader(result.settings.receiptHeader || '')
        setFooter(result.settings.receiptFooter || '')
        if (result.settings.receiptLogo) {
          try {
            const parsed = JSON.parse(result.settings.receiptLogo)
            setLogo(parsed.escpos || null)
            setMonochromePreview(parsed.visual || null)
          } catch (e) {
            // Rétrocompatibilité : si ce n'est pas du JSON, c'est le format brut (ESC/POS base64)
            setLogo(result.settings.receiptLogo)
            setMonochromePreview(null) // L'ancien format ne supportait pas de preview directe sans rechargement
          }
        }
      }
      setIsLoading(false)
    }

    void load()
  }, [storeId])

  // ── Traitement du Logo (Monochrome + Redimensionnement + ESC/POS) ─
  const processImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 1. Redimensionner à une largeur standard pour imprimante thermique (ex: 256px maximum de large)
        const maxWidth = 256
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = img.width * scale
        // La hauteur doit être un multiple de 8 pour ESC/POS
        canvas.height = Math.round((img.height * scale) / 8) * 8
        if (canvas.height === 0) canvas.height = 8

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // 2. Conversion en Monochrome (Seuil à 128)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imgData.data

        // Tableau pour stocker les bits individuels pour la commande raster ESC/POS
        const widthBytes = Math.ceil(canvas.width / 8)
        const escPosData = new Uint8Array(widthBytes * canvas.height)

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            
            // Luminosité standard
            const grey = 0.299 * r + 0.587 * g + 0.114 * b
            const isBlack = grey < 128 // noir si < 128

            // Mettre à jour l'affichage monochrome dans le canvas
            const color = isBlack ? 0 : 255
            data[idx] = color
            data[idx + 1] = color
            data[idx + 2] = color

            // Remplir le bit correspondant pour l'impression thermique
            if (isBlack) {
              const byteIdx = y * widthBytes + Math.floor(x / 8)
              const bitShift = 7 - (x % 8)
              escPosData[byteIdx] |= (1 << bitShift)
            }
          }
        }
        ctx.putImageData(imgData, 0, 0)

        // 3. Encoder la commande ESC/POS raster `GS v 0`
        // GS v 0 m xL xH yL yH d1...dk
        const xL = widthBytes % 256
        const xH = Math.floor(widthBytes / 256)
        const yL = canvas.height % 256
        const yH = Math.floor(canvas.height / 256)

        const headerBytes = new Uint8Array([0x1d, 0x76, 0x30, 0, xL, xH, yL, yH])
        const finalBuffer = new Uint8Array(headerBytes.length + escPosData.length)
        finalBuffer.set(headerBytes, 0)
        finalBuffer.set(escPosData, headerBytes.length)

        // Convertir en base64 pour stockage en BDD
        let binaryString = ''
        for (let i = 0; i < finalBuffer.length; i++) {
          binaryString += String.fromCharCode(finalBuffer[i])
        }
        const base64EscPos = btoa(binaryString)

        // Vérifier la taille limite (augmentée à 20 KB pour permettre plus de flexibilité)
        const sizeInKb = finalBuffer.length / 1024
        setLogoSizeKb(parseFloat(sizeInKb.toFixed(2)))

        if (sizeInKb > 20) {
          setMessage({
            text: `Le logo est trop lourd (${sizeInKb.toFixed(2)} KB). Veuillez utiliser un logo plus simple ou plus petit (< 20 KB).`,
            type: 'error',
          })
          return
        }

        // Mettre à jour les states
        setLogo(base64EscPos)
        setMonochromePreview(canvas.toDataURL())
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Drag & Drop Handlers ─────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processImage(file)
  }, [processImage])

  // ── Sauvegarde ───────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!storeId) return

    setIsSaving(true)
    const combinedLogo = logo && monochromePreview
      ? JSON.stringify({ escpos: logo, visual: monochromePreview })
      : logo

    const result = await updateStoreSettings(storeId, {
      receiptLogo: combinedLogo,
      receiptHeader: header,
      receiptFooter: footer,
    })

    if (result.success) {
      setMessage({ text: 'Réglages des reçus enregistrés avec succès.', type: 'success' })
    } else {
      setMessage({ text: result.error || 'Erreur lors de la sauvegarde.', type: 'error' })
    }

    setIsSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }, [storeId, logo, header, footer])

  // ── Simuler un test d'impression ──────────────────────────────────
  const handlePrintTest = () => {
    setMessage({
      text: "Simulation d'impression envoyée à l'imprimante locale !",
      type: 'success',
    })
    setTimeout(() => setMessage(null), 3000)
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--parabellum-primary)] border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
            Personnalisation des Reçus
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Configurez le logo monochrome, les en-têtes et pieds de page de vos tickets de caisse
          </p>
        </div>
      </div>

      {/* ── MESSAGE TOAST ──────────────────────────────────────── */}
      {message && (
        <div
          className={`rounded-xl p-4 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── COLONNE DE CONFIGURATION ─────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl space-y-6">
            
            {/* SECTION 1: LOGO */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-black">1</span>
                Logo Monochrome (ESC/POS)
              </h2>
              <p className="text-xs text-gray-500">
                L&apos;image sera automatiquement convertie en noir et blanc (seuil 128) et optimisée pour une impression thermique directe rapide.
              </p>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  monochromePreview
                    ? 'border-green-300 bg-green-50/20'
                    : 'border-gray-200 hover:border-blue-500 bg-gray-50/50'
                }`}
              >
                {monochromePreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={monochromePreview}
                      alt="Logo monochrome"
                      className="h-20 object-contain bg-white border border-gray-200 p-1"
                    />
                    <div className="text-center">
                      <p className="text-xs font-bold text-green-700">Logo chargé avec succès</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Taille estimée : {logoSizeKb} KB (Limite max : 20 KB)</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Upload className="w-8 h-8 text-gray-300" />
                    <span className="text-xs font-bold uppercase tracking-wider">Glisser-déposer ou cliquer pour importer</span>
                    <span className="text-[9px] text-gray-400">PNG, JPG ou SVG</span>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) processImage(file)
                  }}
                />

                {monochromePreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setLogo(null)
                      setMonochromePreview(null)
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-gray-200 hover:border-red-500 hover:text-red-500 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {logoSizeKb > 15 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Logo proche de la limite thermique. Il est recommandé de simplifier le dessin.</span>
                </div>
              )}
            </div>

            {/* SECTION 2: EN-TÊTE & PIED DE PAGE */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-black">2</span>
                Textes personnalisés
              </h2>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En-tête du reçu</label>
                <textarea
                  rows={2}
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="Ex: BIENVENUE CHEZ GOURMET POS&#13;Ouvert de 8h à 23h&#13;Tel: +225 01 02 03 04"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pied de page du reçu</label>
                <textarea
                  rows={2}
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="Ex: Merci de votre visite !&#13;À bientôt&#13;Reçu imprimé sur papier thermique recyclable"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintTest}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 active:scale-95 px-5 py-3 text-sm font-bold text-gray-700 shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimer un test
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Enregistrer
            </button>
          </div>
        </div>

        {/* ── COLONNE DE PREVIEW (TICKET DE CAISSE TROP PREMIUM) ─ */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 ml-2">Aperçu du Reçu 80mm</h3>
          
          <div className="relative rounded-[2rem] border border-gray-200 bg-white p-6 shadow-xl overflow-hidden font-mono text-gray-800 text-xs leading-relaxed max-w-sm mx-auto">
            {/* Dents du papier déchiré en haut */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-b from-gray-100 to-transparent flex overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-4 h-4 rotate-45 bg-gray-50 border border-gray-200/50 -mt-2 shrink-0" />
              ))}
            </div>

            <div className="pt-4 space-y-4 text-center">
              {/* Logo monochrome */}
              {monochromePreview ? (
                <div className="flex justify-center">
                  <img src={monochromePreview} alt="Preview monochrome" className="h-16 object-contain bg-white border border-gray-100 p-0.5" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-300">
                  Logo
                </div>
              )}

              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Facture Simplifiée
              </h2>

              {/* En-tête */}
              {header ? (
                <div className="whitespace-pre-line text-[10px] text-gray-500 leading-tight uppercase">
                  {header}
                </div>
              ) : (
                <div className="text-[10px] text-gray-300 italic">Configuration en-tête...</div>
              )}

              <div className="border-t-2 border-dashed border-gray-200 my-2" />

              {/* Infos standard du reçu */}
              <div className="text-left text-[10px] text-gray-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>: {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Facture N°</span>
                  <span>: FAC-0626-00001</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-200 my-2" />

              {/* Articles de test */}
              <div className="space-y-2 text-left">
                <div className="flex flex-col">
                  <div className="flex justify-between text-[11px] font-bold text-gray-900">
                    <span>Garba Prestige</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-[10px]">
                    <span>1 &nbsp;&nbsp;&nbsp; 4500.00 (18.0)%</span>
                    <span>4500.00</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex justify-between text-[11px] font-bold text-gray-900">
                    <span>Jus de Bissap</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-[10px]">
                    <span>2 &nbsp;&nbsp;&nbsp; 1000.00 (18.0)%</span>
                    <span>2000.00</span>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-200 my-2" />

              {/* Totaux */}
              <div className="text-left text-[10px] text-gray-700 space-y-1">
                <div className="flex justify-between">
                  <span>Nombre d&apos;articles</span>
                  <span>3</span>
                </div>
                <div className="flex justify-between">
                  <span>Montant total</span>
                  <span>6500.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Remise promotionnelle totale</span>
                  <span>0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Remise du vendeur</span>
                  <span>0.00</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-[11px] pt-1 border-t border-dashed border-gray-200">
                  <span>Total des ventes</span>
                  <span>6500.00</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 mt-1 text-[11px]">
                  <span>Espèces payées</span>
                  <span>6500.00</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-200 my-2" />

              {/* Ventilation fiscale */}
              <div className="text-left text-[10px]">
                <div className="grid grid-cols-4 font-bold text-gray-900 border-b border-dashed border-gray-200 pb-1 mb-1 text-[9px]">
                  <span>TVA</span>
                  <span>Taux</span>
                  <span className="text-right">Base HT</span>
                  <span className="text-right">Montant</span>
                </div>
                <div className="grid grid-cols-4 text-gray-600 text-[9px]">
                  <span>TVA</span>
                  <span>18.0%</span>
                  <span className="text-right">5508.47</span>
                  <span className="text-right">991.53</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-200 my-2" />

              <p className="text-gray-700 font-bold text-[10px] text-left">
                Vous avez été servi par Awa Diomandé
              </p>

              {/* Pied de page */}
              {footer ? (
                <div className="whitespace-pre-line text-[10px] text-gray-500 leading-tight">
                  {footer}
                </div>
              ) : (
                <div className="text-[10px] text-gray-300 italic">Configuration pied de page...</div>
              )}
            </div>

            {/* Dents du papier déchiré en bas */}
            <div className="absolute bottom-0 inset-x-0 h-2 flex overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-4 h-4 rotate-45 bg-gray-50 border border-gray-200/50 mt-1 shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
