'use client'

import React, { useState } from 'react'
import { Settings, Save, ShieldCheck, Globe, Mail, Phone, Percent, Wallet, BellRing } from 'lucide-react'

export default function AdminConfig() {
  const [config, setConfig] = useState({
    siteName: 'Ma Plateforme POS',
    currency: 'FCFA',
    supportEmail: 'support@plateforme.ci',
    supportPhone: '+225 00 00 00 00',
    defaultCommission: 15,
    deliveryPay: 500,
    minWithdrawal: 5000,
    require2FA: true,
    dailyReport: true
  })

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#212529] tracking-tight uppercase">Configuration</h1>
          <p className="text-[#adb5bd] text-sm font-bold uppercase tracking-widest mt-1">Paramètres globaux du système de supervision</p>
        </div>
        <button className="bg-[#212529] hover:bg-black text-white px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-xl">
          <Save className="w-5 h-5" />
          Sauvegarder
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Section 1: Identité */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-[#dee2e6] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#f1f3f5] rounded-xl"><Globe className="w-5 h-5 text-[#212529]" /></div>
            <h2 className="text-sm font-black text-[#212529] uppercase tracking-widest">Identité & Localisation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConfigInput label="Nom de la plateforme" value={config.siteName} />
            <ConfigInput label="Devise de la plateforme" value={config.currency} />
          </div>
        </div>

        {/* Section 2: Support */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-[#dee2e6] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#f1f3f5] rounded-xl"><Mail className="w-5 h-5 text-[#212529]" /></div>
            <h2 className="text-sm font-black text-[#212529] uppercase tracking-widest">Support & Contact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConfigInput label="Email de Support" value={config.supportEmail} icon={<Mail className="w-4 h-4 text-[#adb5bd]" />} />
            <ConfigInput label="Téléphone de Support" value={config.supportPhone} icon={<Phone className="w-4 h-4 text-[#adb5bd]" />} />
          </div>
        </div>

        {/* Section 3: Économie */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-[#dee2e6] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#f1f3f5] rounded-xl"><Percent className="w-5 h-5 text-[#212529]" /></div>
            <h2 className="text-sm font-black text-[#212529] uppercase tracking-widest">Paramètres Financiers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConfigInput label="Commission par défaut (%)" value={config.defaultCommission.toString()} />
            <ConfigInput label="Retrait minimum livreur (FCFA)" value={config.minWithdrawal.toString()} icon={<Wallet className="w-4 h-4 text-[#adb5bd]" />} />
          </div>
        </div>

        {/* Section 4: Sécurité & Rapports */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-[#dee2e6] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#f1f3f5] rounded-xl"><ShieldCheck className="w-5 h-5 text-[#212529]" /></div>
            <h2 className="text-sm font-black text-[#212529] uppercase tracking-widest">Sécurité & Reporting</h2>
          </div>
          <div className="space-y-6">
            <ConfigToggle label="Obligation 2FA pour les administrateurs" description="Renforce la sécurité des accès sensibles" active={config.require2FA} />
            <div className="h-px bg-[#f1f3f5]" />
            <ConfigToggle label="Envoi du rapport quotidien automatique" description="Synthèse envoyée chaque soir à minuit" active={config.dailyReport} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfigInput({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>}
        <input 
          type="text" 
          defaultValue={value}
          className={`w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl ${icon ? 'pl-11' : 'px-4'} py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#212529] transition-all`}
        />
      </div>
    </div>
  )
}

function ConfigToggle({ label, description, active }: { label: string, description: string, active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-xs font-black text-[#212529] uppercase tracking-tight">{label}</h4>
        <p className="text-[10px] font-bold text-[#adb5bd] uppercase mt-0.5">{description}</p>
      </div>
      <button className={`w-12 h-6 rounded-full transition-all relative ${active ? 'bg-[#51cf66]' : 'bg-[#dee2e6]'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}
