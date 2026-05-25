'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getHrConfiguration, updateHrConfiguration } from '@/app/actions/rh/configuration'
import { Settings, Save, Calculator, Percent, Plus, Trash2 } from 'lucide-react'

const defaultTaxRates = {
  cnBrackets: [
    { min: 0, max: 50000, rate: 0 },
    { min: 50000, max: 130000, rate: 0.015 },
    { min: 130000, max: 200000, rate: 0.05 },
    { min: 200000, max: null, rate: 0.10 }
  ],
  igrBrackets: [
    { min: 833333, rate: 0.36, deduction: 80533 },
    { min: 416666, rate: 0.32, deduction: 47200 },
    { min: 275000, rate: 0.28, deduction: 30533 },
    { min: 195833, rate: 0.24, deduction: 19533 },
    { min: 112500, rate: 0.20, deduction: 11700 },
    { min: 71500, rate: 0.15, deduction: 6075 },
    { min: 25000, rate: 0.10, deduction: 2500 },
    { min: 0, rate: 0, deduction: 0 }
  ],
  partsConfig: {
    SINGLE: { base: 1, withChildrenBase: 1.5, perChild: 0.5 },
    DIVORCED: { base: 1, withChildrenBase: 1.5, perChild: 0.5 },
    MARRIED: { base: 2, withChildrenBase: 2, perChild: 0.5 },
    WIDOWED: { base: 2, withChildrenBase: 2, perChild: 0.5 },
    maxParts: 5
  }
}

export default function ConfigurationRhPage() {
  const { data: session } = useSession()
  const storeId = session?.user?.storeId

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('generaux')
  const [message, setMessage] = useState({ text: '', type: '' })
  
  const [formData, setFormData] = useState({
    cnpsEmployeeRate: 6.3,
    cnpsEmployerRate: 16.45,
    itsRate: 1.2,
    baseImposableRate: 80.0,
    cnpsCeiling: 1647315,
    igrBaseRate: 85.0,
    taxRates: defaultTaxRates
  })

  useEffect(() => {
    if (storeId) {
      loadConfig()
    }
  }, [storeId])

  const loadConfig = async () => {
    setIsLoading(true)
    const result = await getHrConfiguration(storeId as string)
    if (result.success && result.config) {
      let parsedRates = defaultTaxRates;
      try {
        if (typeof result.config.taxRates === 'string') {
          parsedRates = JSON.parse(result.config.taxRates);
        } else if (result.config.taxRates) {
          parsedRates = result.config.taxRates as any;
        }
      } catch(e) {
        console.error("Error parsing taxRates", e)
      }

      setFormData({
        cnpsEmployeeRate: result.config.cnpsEmployeeRate,
        cnpsEmployerRate: result.config.cnpsEmployerRate,
        itsRate: result.config.itsRate,
        baseImposableRate: result.config.baseImposableRate,
        cnpsCeiling: result.config.cnpsCeiling,
        igrBaseRate: result.config.igrBaseRate,
        taxRates: parsedRates
      })
    }
    setIsLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }))
  }

  const handleBracketChange = (type: 'cnBrackets' | 'igrBrackets', index: number, field: string, value: string) => {
    setFormData(prev => {
      const newBrackets = [...prev.taxRates[type]]
      let parsedValue: number | null = parseFloat(value)
      if (value === '' || isNaN(parsedValue)) {
        parsedValue = null
      }
      newBrackets[index] = { ...newBrackets[index], [field]: parsedValue }
      return {
        ...prev,
        taxRates: {
          ...prev.taxRates,
          [type]: newBrackets
        }
      }
    })
  }

  const removeBracket = (type: 'cnBrackets' | 'igrBrackets', index: number) => {
    setFormData(prev => {
      const newBrackets = [...prev.taxRates[type]]
      newBrackets.splice(index, 1)
      return {
        ...prev,
        taxRates: {
          ...prev.taxRates,
          [type]: newBrackets
        }
      }
    })
  }

  const addBracket = (type: 'cnBrackets' | 'igrBrackets') => {
    setFormData(prev => {
      const newBrackets = [...prev.taxRates[type]]
      if (type === 'cnBrackets') {
        newBrackets.push({ min: 0, max: null, rate: 0 })
      } else {
        newBrackets.push({ min: 0, rate: 0, deduction: 0 })
      }
      return {
        ...prev,
        taxRates: {
          ...prev.taxRates,
          [type]: newBrackets
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) return

    setIsSaving(true)
    setMessage({ text: '', type: '' })

    const dataToSave = {
      ...formData,
      taxRates: JSON.stringify(formData.taxRates)
    }

    const result = await updateHrConfiguration(storeId, dataToSave as any)
    
    if (result.success) {
      setMessage({ text: 'Configuration enregistrée avec succès.', type: 'success' })
    } else {
      setMessage({ text: result.error || 'Erreur lors de la sauvegarde.', type: 'error' })
    }
    
    setIsSaving(false)
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
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
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Configuration RH</h1>
          <p className="text-sm font-medium text-gray-500">Paramétrage dynamique complet des lois fiscales</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-xl overflow-hidden">
        <div className="flex bg-gray-50/80 p-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setActiveTab('generaux')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${activeTab === 'generaux' ? 'bg-white text-[var(--parabellum-primary)] shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            Taux Généraux
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cn')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${activeTab === 'cn' ? 'bg-white text-[var(--parabellum-primary)] shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            Tranches CN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('igr')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${activeTab === 'igr' ? 'bg-white text-[var(--parabellum-primary)] shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            Tranches IGR
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {message.text && (
            <div className={`mb-6 rounded-xl p-4 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'generaux' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-700">
                <Calculator className="h-5 w-5 text-[var(--parabellum-primary)]" />
                Taux Généraux de Côte d'Ivoire
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Percent className="h-4 w-4" /> Taux CNPS Salariale
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="cnpsEmployeeRate"
                  value={formData.cnpsEmployeeRate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 pl-4 pr-8 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-[var(--parabellum-primary)] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Percent className="h-4 w-4" /> Taux CNPS Patronale
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="cnpsEmployerRate"
                  value={formData.cnpsEmployerRate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 pl-4 pr-8 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-[var(--parabellum-primary)] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Percent className="h-4 w-4" /> Taux ITS
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="itsRate"
                  value={formData.itsRate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 pl-4 pr-8 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-[var(--parabellum-primary)] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Percent className="h-4 w-4" /> Base Imposable
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="baseImposableRate"
                  value={formData.baseImposableRate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 pl-4 pr-8 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-[var(--parabellum-primary)] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Calculator className="h-4 w-4" /> Plafond CNPS
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="cnpsCeiling"
                  value={formData.cnpsCeiling}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 pl-4 pr-12 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-[var(--parabellum-primary)] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">CFA</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Percent className="h-4 w-4" /> Abattement IGR
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="igrBaseRate"
                  value={formData.igrBaseRate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 pl-4 pr-8 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-[var(--parabellum-primary)] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>
          </div>
          )}

          {/* SECTION : TRANCHES CN */}
          {activeTab === 'cn' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-gray-800">Tranches : Contribution Nationale (CN)</h3>
                <p className="text-xs text-gray-500">Configurez les taux applicables par tranche de salaire.</p>
              </div>
              <button
                type="button"
                onClick={() => addBracket('cnBrackets')}
                className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">Minimum (FCFA)</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Maximum (FCFA)</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Taux</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {formData.taxRates.cnBrackets.map((bracket, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={bracket.min ?? ''}
                          onChange={(e) => handleBracketChange('cnBrackets', i, 'min', e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-1.5 outline-none focus:border-[var(--parabellum-primary)]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          placeholder="Infini"
                          value={bracket.max ?? ''}
                          onChange={(e) => handleBracketChange('cnBrackets', i, 'max', e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-1.5 outline-none focus:border-[var(--parabellum-primary)]"
                        />
                      </td>
                      <td className="px-4 py-2 relative">
                        <input
                          type="number"
                          step="0.001"
                          value={bracket.rate ?? ''}
                          onChange={(e) => handleBracketChange('cnBrackets', i, 'rate', e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-1.5 outline-none focus:border-[var(--parabellum-primary)]"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => removeBracket('cnBrackets', i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* SECTION : TRANCHES IGR */}
          {activeTab === 'igr' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-gray-800">Tranches : Impôt Général sur le Revenu (IGR)</h3>
                <p className="text-xs text-gray-500">Configurez les barèmes et abattements pour l'IGR sur le Q.</p>
              </div>
              <button
                type="button"
                onClick={() => addBracket('igrBrackets')}
                className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">Minimum (Q)</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Taux</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Déduction (FCFA)</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {formData.taxRates.igrBrackets.map((bracket, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={bracket.min ?? ''}
                          onChange={(e) => handleBracketChange('igrBrackets', i, 'min', e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-1.5 outline-none focus:border-[var(--parabellum-primary)]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={bracket.rate ?? ''}
                          onChange={(e) => handleBracketChange('igrBrackets', i, 'rate', e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-1.5 outline-none focus:border-[var(--parabellum-primary)]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={bracket.deduction ?? ''}
                          onChange={(e) => handleBracketChange('igrBrackets', i, 'deduction', e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-1.5 outline-none focus:border-[var(--parabellum-primary)]"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => removeBracket('igrBrackets', i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-[var(--parabellum-primary)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              {isSaving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
