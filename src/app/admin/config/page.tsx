'use client'

import React, { useState } from 'react'
import { Save, ShieldCheck, Globe, Mail, Phone, Percent, Wallet } from 'lucide-react'

export default function AdminConfig() {
  const [config] = useState({
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
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Configuration</h1>
          <p className="mt-2 text-base font-medium text-[#72788f]">Paramètres globaux du système de supervision</p>
        </div>
        <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-[var(--parabellum-primary)] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-[#253ec7] sm:w-auto sm:px-8">
          <Save className="w-5 h-5" />
          Sauvegarder
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Section 1: Identité */}
        <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-full bg-[#eef1ff] p-3 text-[var(--parabellum-primary)]"><Globe className="w-5 h-5" /></div>
            <h2 className="text-xl font-black text-black">Identité & Localisation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConfigInput label="Nom de la plateforme" value={config.siteName} />
            <ConfigInput label="Devise de la plateforme" value={config.currency} />
          </div>
        </div>

        {/* Section 2: Support */}
        <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-full bg-[#eef1ff] p-3 text-[var(--parabellum-primary)]"><Mail className="w-5 h-5" /></div>
            <h2 className="text-xl font-black text-black">Support & Contact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConfigInput label="Email de Support" value={config.supportEmail} icon={<Mail className="w-4 h-4 text-[#adb5bd]" />} />
            <ConfigInput label="Téléphone de Support" value={config.supportPhone} icon={<Phone className="w-4 h-4 text-[#adb5bd]" />} />
          </div>
        </div>

        {/* Section 3: Économie */}
        <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-full bg-[#eef1ff] p-3 text-[var(--parabellum-primary)]"><Percent className="w-5 h-5" /></div>
            <h2 className="text-xl font-black text-black">Paramètres Financiers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConfigInput label="Commission par défaut (%)" value={config.defaultCommission.toString()} />
            <ConfigInput label="Retrait minimum livreur (FCFA)" value={config.minWithdrawal.toString()} icon={<Wallet className="w-4 h-4 text-[#adb5bd]" />} />
          </div>
        </div>

        {/* Section 4: Sécurité & Rapports */}
        <div className="rounded-xl bg-white p-7 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-full bg-[#eef1ff] p-3 text-[var(--parabellum-primary)]"><ShieldCheck className="w-5 h-5" /></div>
            <h2 className="text-xl font-black text-black">Sécurité & Reporting</h2>
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
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#8a92a6]">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>}
        <input 
          type="text" 
          defaultValue={value}
          className={`w-full rounded-xl border border-[#e8eaf4] bg-[#f8f9ff] ${icon ? 'pl-11' : 'px-4'} py-3 text-xs font-bold transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--parabellum-primary)]`}
        />
      </div>
    </div>
  )
}

function ConfigToggle({ label, description, active }: { label: string, description: string, active: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 className="text-xs font-black uppercase tracking-tight text-black">{label}</h4>
        <p className="mt-0.5 text-[10px] font-bold uppercase text-[#8a92a6]">{description}</p>
      </div>
      <button className={`relative h-6 w-12 rounded-full transition-all ${active ? 'bg-[var(--parabellum-success)]' : 'bg-[#dee2e6]'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}
