import React from 'react'
import { User, Shield, Key, Mail, Lock, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6D00]">IDENTITÉ & SÉCURITÉ</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-black sm:text-4xl">
          Mon Profil Administrateur
        </h1>
        <p className="mt-2 text-sm font-semibold text-[#868e96]">
          Gérez vos informations de compte, vos clés d'API système et vos préférences de sécurité.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Side: Avatar Card */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#FF6D00] text-3xl font-black text-white shadow-lg shadow-orange-500/20">
            AU
            <div className="absolute bottom-0 right-0 rounded-full border-4 border-white bg-green-500 p-2" />
          </div>
          <h2 className="mt-5 text-base font-black text-black">Utilisateur administrateur</h2>
          <span className="mt-1 rounded-lg bg-[#FF6D00]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#FF6D00]">
            SUPERADMINISTRATEUR
          </span>
          <p className="mt-4 text-xs font-semibold text-[#868e96]">
            Accès complet à toutes les fonctionnalités et API multi-restaurants de la franchise.
          </p>
        </div>

        {/* Right Side: Account Details & Security Forms */}
        <div className="md:col-span-2 space-y-8">
          {/* Section 1: Informations Personnelles */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
            <h3 className="text-sm font-black text-black mb-6">Informations personnelles</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#868e96] mb-2">
                  Nom Complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
                  <input
                    type="text"
                    defaultValue="Utilisateur administrateur"
                    disabled
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 pl-10 pr-4 text-xs font-bold text-[#868e96] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#868e96] mb-2">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
                  <input
                    type="email"
                    defaultValue="admin@gourmet.ci"
                    disabled
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-3 pl-10 pr-4 text-xs font-bold text-[#868e96] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sécurité & Mot de Passe */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
            <h3 className="text-sm font-black text-black mb-6">Changement de mot de passe</h3>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#868e96] mb-2">
                    Ancien mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-[#E5E7EB] bg-white py-3 pl-10 pr-4 text-xs font-bold text-black outline-none focus:border-[#FF6D00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#868e96] mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#adb5bd]" />
                    <input
                      type="password"
                      placeholder="Min. 8 caractères"
                      className="w-full rounded-xl border border-[#E5E7EB] bg-white py-3 pl-10 pr-4 text-xs font-bold text-black outline-none focus:border-[#FF6D00]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-[#F0F1F6] pt-4">
                <button
                  type="submit"
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6D00] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/10 hover:bg-[#E66200] transition-all disabled:opacity-50"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
