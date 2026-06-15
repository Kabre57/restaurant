'use client'

import React, { useState, useEffect, startTransition } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  Printer, 
  Settings, 
  Trash2, 
  Plus, 
  Wifi, 
  Usb, 
  Bluetooth, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  FileText, 
  ChevronLeft,
  Loader2,
  Check,
  RefreshCw
} from 'lucide-react'
import { 
  getPrinters, 
  savePrinter, 
  deletePrinter, 
  testPrinterConnection,
  discoverPrinters
} from '@/app/actions/caisse/printers'
import { getCategoriesByStore } from '@/app/actions/catalog/products'

type PrinterData = {
  id: string
  name: string
  type: string
  ipAddress: string | null
  port: number
  paperWidth: number
  printReceipts: boolean
  printOrders: boolean
  categories: string | null
}

type CategoryData = {
  id: string
  name: string
}

type TestResultType = {
  success: boolean
  message?: string
  error?: string
  receiptPreview?: string
}

export default function HardwareAdminPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [loading, setLoading] = useState(true)
  const [printers, setPrinters] = useState<PrinterData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  
  // Form State
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('ETHERNET')
  const [ipAddress, setIpAddress] = useState('')
  const [port, setPort] = useState(9100)
  const [password, setPassword] = useState('') // non utilisé
  const [paperWidth, setPaperWidth] = useState(80)
  const [printReceipts, setPrintReceipts] = useState(true)
  const [printOrders, setPrintOrders] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // UI Status
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [testResult, setTestResult] = useState<TestResultType | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveredPrinters, setDiscoveredPrinters] = useState<any[]>([])

  useEffect(() => {
    const activeStoreId = storeId as string
    if (!activeStoreId) return
    let isCancelled = false

    async function loadData() {
      setLoading(true)
      const [printersRes, categoriesRes] = await Promise.all([
        getPrinters(activeStoreId),
        getCategoriesByStore(activeStoreId)
      ])

      if (isCancelled) return

      if (printersRes.success && printersRes.printers) {
        setPrinters(printersRes.printers as PrinterData[])
      }
      if (categoriesRes) {
        setCategories(categoriesRes as CategoryData[])
      }
      setLoading(false)
    }

    void loadData()
    return () => {
      isCancelled = true
    }
  }, [storeId])

  const handleAddClick = () => {
    setIsEditing(true)
    setSelectedId(null)
    setName('')
    setType('ETHERNET')
    setIpAddress('')
    setPort(9100)
    setPaperWidth(80)
    setPrintReceipts(true)
    setPrintOrders(false)
    setSelectedCategories([])
    setTestResult(null)
  }

  const handleEditClick = (printer: PrinterData) => {
    setIsEditing(true)
    setSelectedId(printer.id)
    setName(printer.name)
    setType(printer.type)
    setIpAddress(printer.ipAddress || '')
    setPort(printer.port)
    setPaperWidth(printer.paperWidth)
    setPrintReceipts(printer.printReceipts)
    setPrintOrders(printer.printOrders)
    setSelectedCategories(printer.categories ? printer.categories.split(',') : [])
    setTestResult(null)
  }

  const handleCategoryToggle = (catName: string) => {
    setSelectedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) return

    setIsSaving(true)
    setMessage('')

    const res = await savePrinter(storeId, {
      id: selectedId || undefined,
      name,
      type,
      ipAddress: type === 'ETHERNET' ? ipAddress : null,
      port,
      paperWidth,
      printReceipts,
      printOrders,
      categories: selectedCategories.length > 0 ? selectedCategories.join(',') : null
    })

    if (res.success && res.printer) {
      const saved = res.printer as PrinterData
      setPrinters(prev => {
        const index = prev.findIndex(p => p.id === saved.id)
        if (index > -1) {
          const updated = [...prev]
          updated[index] = saved
          return updated
        } else {
          return [...prev, saved]
        }
      })
      setMessage(selectedId ? 'Imprimante mise à jour avec succès !' : 'Nouvelle imprimante ajoutée !')
      setIsEditing(false)
      setTimeout(() => setMessage(''), 3000)
    } else {
      alert(res.error || "Erreur lors de l'enregistrement.")
    }
    setIsSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette imprimante ?')) return

    const res = await deletePrinter(id)
    if (res.success) {
      setPrinters(prev => prev.filter(p => p.id !== id))
      if (selectedId === id) {
        setIsEditing(false)
      }
      setMessage('Imprimante supprimée avec succès.')
      setTimeout(() => setMessage(''), 3000)
    } else {
      alert(res.error)
    }
  }

  const handleTestPrint = async (id: string) => {
    setTestingId(id)
    setTestResult(null)

    const res = await testPrinterConnection(id)
    setTestingId(null)
    setTestResult(res)
  }

  const handleDiscover = async () => {
    setIsDiscovering(true)
    setDiscoveredPrinters([])
    
    const res = await discoverPrinters()
    if (res.success && res.printers) {
      setDiscoveredPrinters(res.printers as any[])
    } else {
      alert(res.error || "Aucune imprimante trouvée.")
    }
    
    setIsDiscovering(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/restaurateur/config" className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#dee2e6] hover:bg-[#f8f9fa] transition-all text-[#495057]">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-black tracking-tight text-[#212529] uppercase sm:text-2xl">Périphériques & Matériel</h1>
          </div>
          <p className="text-[#adb5bd] text-xs font-bold uppercase tracking-widest mt-1 ml-10">Configurez vos imprimantes thermiques de caisse et de cuisine (ESC/POS)</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest px-4 py-3 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" /> Ajouter Imprimante
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest">{message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Printers List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#212529] flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-500" /> Vos Équipements ({printers.length})
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Agent Actif (Port 3003)
                </span>
              </div>

              {printers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#dee2e6] rounded-2xl bg-[#f8f9fa] p-8">
                  <Printer className="w-12 h-12 text-[#adb5bd] mb-3 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#495057] mb-1">Aucune imprimante configurée</h3>
                  <p className="text-[10px] text-[#adb5bd] uppercase tracking-widest max-w-sm mb-4">Associez vos imprimantes thermiques de caisse ou cuisine (ESC/POS) pour débuter l&apos;impression automatique.</p>
                  <button onClick={handleAddClick} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white border border-[#dee2e6] px-4 py-2 rounded-xl text-[#212529] hover:bg-[#f8f9fa] transition-all">
                    <Plus className="w-3.5 h-3.5 text-amber-500" /> Configurer un matériel
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#e9ecef]">
                  {printers.map(printer => (
                    <div key={printer.id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-widest text-[#212529]">{printer.name}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            printer.type === 'ETHERNET' ? 'bg-blue-50 text-blue-700' :
                            printer.type === 'USB' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'
                          }`}>
                            {printer.type === 'ETHERNET' ? <Wifi className="w-2.5 h-2.5" /> : 
                             printer.type === 'USB' ? <Usb className="w-2.5 h-2.5" /> : <Bluetooth className="w-2.5 h-2.5" />}
                            {printer.type}
                          </span>
                          <span className="text-[9px] font-black text-[#868e96] bg-[#f1f3f5] px-2 py-0.5 rounded-full">
                            {printer.paperWidth}mm
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#868e96] font-bold uppercase tracking-wider">
                          {printer.type === 'ETHERNET' && <span>IP: {printer.ipAddress}</span>}
                          {printer.printReceipts && <span className="text-amber-600">✓ Reçus & Factures</span>}
                          {printer.printOrders && <span className="text-indigo-600">✓ Cuisine ({printer.categories || 'Tout'})</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleTestPrint(printer.id)}
                          disabled={testingId !== null}
                          className="flex items-center gap-1.5 rounded-xl border border-[#dee2e6] hover:border-amber-500 bg-white hover:bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#495057] hover:text-amber-700 transition-all disabled:opacity-50"
                        >
                          {testingId === printer.id ? <Loader2 className="w-3 h-3 animate-spin text-amber-500" /> : <FileText className="w-3 h-3 text-amber-500" />}
                          Test
                        </button>
                        <button 
                          onClick={() => handleEditClick(printer)}
                          className="flex items-center gap-1.5 rounded-xl border border-[#dee2e6] hover:border-[#212529] bg-white hover:bg-[#f8f9fa] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#495057] transition-all"
                        >
                          <Settings className="w-3 h-3 text-[#868e96]" />
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(printer.id)}
                          className="flex items-center justify-center rounded-xl border border-red-200 hover:border-red-500 bg-white hover:bg-red-50 p-2 text-red-600 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Result visual representation */}
            {testResult && (
              <div className={`rounded-[2rem] border p-6 shadow-sm animate-slideUp ${
                testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  Résultat du Test de Communication
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-4 text-[#495057]">{testResult.message}</p>
                
                {testResult.receiptPreview && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#868e96] block ml-1">Aperçu du ticket thermique généré :</span>
                    <pre className="bg-white border border-[#dee2e6] rounded-2xl p-4 font-mono text-[10px] text-gray-800 leading-relaxed overflow-x-auto shadow-inner max-w-full text-center">
                      {testResult.receiptPreview}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Add/Edit Form */}
          <div className="lg:col-span-1">
            {isEditing ? (
              <form onSubmit={handleSave} className="rounded-[2rem] border border-amber-200 bg-amber-50/20 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-800">
                    {selectedId ? 'Modifier Périphérique' : 'Ajouter Périphérique'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => { setIsEditing(false); setTestResult(null); }}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
                  >
                    Annuler
                  </button>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-amber-800 ml-1">Nom de l&apos;imprimante</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="EX: Imprimante Cuisine" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-[#dee2e6] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[#495057]" 
                  />
                </div>

                {/* Connection Type */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-amber-800 ml-1">Type de connexion</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-white border border-[#dee2e6] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[#495057]"
                  >
                    <option value="ETHERNET">ETHERNET (Réseau IP)</option>
                    <option value="USB">USB (Câble local)</option>
                    <option value="BLUETOOTH">BLUETOOTH</option>
                  </select>
                </div>

                {/* Ethernet Settings */}
                {type === 'ETHERNET' && (
                  <div className="grid grid-cols-3 gap-3 animate-fadeIn">
                    <div className="col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black uppercase tracking-widest text-amber-800 ml-1">Adresse IP</label>
                        <button 
                          type="button" 
                          onClick={handleDiscover}
                          disabled={isDiscovering}
                          className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-800 flex items-center gap-1"
                        >
                          {isDiscovering ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Rechercher
                        </button>
                      </div>
                      <input 
                        required 
                        type="text" 
                        placeholder="EX: 192.168.1.100" 
                        value={ipAddress} 
                        onChange={(e) => setIpAddress(e.target.value)}
                        className="w-full bg-white border border-[#dee2e6] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[#495057]" 
                      />
                      {discoveredPrinters.length > 0 && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2 max-h-32 overflow-y-auto">
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-800 block mb-1">Résultats de recherche :</span>
                          {discoveredPrinters.map((p, i) => (
                            <div 
                              key={i} 
                              onClick={() => { setIpAddress(p.ip); if(p.name) setName(p.name); setDiscoveredPrinters([]); }}
                              className="flex justify-between items-center p-2 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
                            >
                              <span className="text-[10px] font-bold text-[#495057]">{p.name || 'Imprimante Inconnue'}</span>
                              <span className="text-[10px] text-amber-600">{p.ip}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-amber-800 ml-1">Port</label>
                      <input 
                        required 
                        type="number" 
                        value={port} 
                        onChange={(e) => setPort(parseInt(e.target.value) || 9100)}
                        className="w-full bg-white border border-[#dee2e6] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[#495057]" 
                      />
                    </div>
                  </div>
                )}

                {/* Paper Width */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-amber-800 ml-1">Largeur du papier</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setPaperWidth(80)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        paperWidth === 80 
                          ? 'border-amber-500 bg-amber-500 text-white font-black' 
                          : 'border-[#dee2e6] bg-white text-[#495057] hover:bg-[#f8f9fa]'
                      }`}
                    >
                      80 mm (Standard)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaperWidth(58)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        paperWidth === 58 
                          ? 'border-amber-500 bg-amber-500 text-white font-black' 
                          : 'border-[#dee2e6] bg-white text-[#495057] hover:bg-[#f8f9fa]'
                      }`}
                    >
                      58 mm (Reçu étroit)
                    </button>
                  </div>
                </div>

                {/* Options toggles */}
                <div className="space-y-3 pt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 ml-1 block">Rôles de l&apos;imprimante</span>
                  
                  {/* Receipts */}
                  <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-white/50 transition-all select-none">
                    <input 
                      type="checkbox" 
                      checked={printReceipts} 
                      onChange={(e) => setPrintReceipts(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                    />
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-[#212529] block">Imprimer reçus & factures</span>
                      <span className="text-[9px] font-bold text-[#868e96] uppercase tracking-wide block mt-0.5">Tickets de caisse terminés client</span>
                    </div>
                  </label>

                  {/* Kitchen orders */}
                  <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-white/50 transition-all select-none">
                    <input 
                      type="checkbox" 
                      checked={printOrders} 
                      onChange={(e) => setPrintOrders(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                    />
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-[#212529] block">Imprimer bons de préparation</span>
                      <span className="text-[9px] font-bold text-[#868e96] uppercase tracking-wide block mt-0.5">Envoi des bons en cuisine/bar</span>
                    </div>
                  </label>
                </div>

                {/* routed categories */}
                {printOrders && (
                  <div className="space-y-2 pt-2 border-t border-amber-100 animate-fadeIn">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 ml-1 block">Catégories d&apos;articles routées</span>
                    
                    {categories.length === 0 ? (
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic ml-1">Aucune catégorie de produit disponible</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-white/40 border border-[#dee2e6] rounded-xl">
                        {categories.map(cat => {
                          const isActive = selectedCategories.includes(cat.name)
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleCategoryToggle(cat.name)}
                              className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                                isActive 
                                  ? 'bg-amber-500 border-amber-500 text-white' 
                                  : 'bg-white border-[#dee2e6] text-[#495057] hover:bg-[#f8f9fa]'
                              }`}
                            >
                              {isActive && <Check className="w-3.5 h-3.5" />}
                              {cat.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <span className="text-[8px] text-[#adb5bd] font-bold uppercase tracking-wider block mt-1">Si aucune catégorie n&apos;est sélectionnée, tous les bons de commande seront imprimés.</span>
                  </div>
                )}

                {/* Submit button */}
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest py-3 shadow-md hover:shadow-lg transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer l&apos;imprimante
                </button>
              </form>
            ) : (
              <div className="rounded-[2rem] border border-[#dee2e6] bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-amber-500 mb-2">
                  <Printer className="w-6 h-6 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#212529]">Configuration Matériel</h3>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#868e96] leading-relaxed">
                  G Gourmet POS supporte le protocole brut standard de l&apos;industrie **ESC/POS** sur les interfaces réseau **TCP/IP direct** (Port 9100).
                </p>
                <div className="border-t border-[#f1f3f5] pt-4 space-y-3">
                  <div className="flex items-start gap-2.5 text-[9px] font-bold uppercase tracking-widest text-[#495057]">
                    <span className="w-4 h-4 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">1</span>
                    <span>Branchez l&apos;imprimante au réseau RJ45/LAN local.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[9px] font-bold uppercase tracking-widest text-[#495057]">
                    <span className="w-4 h-4 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">2</span>
                    <span>Effectuez un ticket d&apos;autotest pour récupérer son adresse IP.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[9px] font-bold uppercase tracking-widest text-[#495057]">
                    <span className="w-4 h-4 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">3</span>
                    <span>Configurez-la ci-dessus et cliquez sur **Test** pour valider !</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
