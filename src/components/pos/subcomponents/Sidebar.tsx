'use client'

import React from 'react'
import { Utensils, LayoutGrid, Bell, Settings, User, LogOut, Calendar, Map as MapIcon } from 'lucide-react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  isRestaurateur: boolean
  setShowSessionStats: (val: boolean) => void
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export function Sidebar({ isRestaurateur, setShowSessionStats, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className={`w-20 flex flex-col items-center py-8 border-r justify-between z-30 shadow-sm transition-all duration-500 ${isRestaurateur ? 'bg-[#1a1d24] border-white/5 text-white shadow-2xl' : 'bg-white border-[#e9ecef] text-[#1a1d24]'}`}>
      <div className="flex flex-col gap-6 w-full items-center">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mb-2 ${isRestaurateur ? 'bg-white/10' : 'bg-[#212529]'}`}>
          <Utensils className="text-white w-6 h-6" />
        </div>
        <SidebarLink icon={<LayoutGrid />} label="CAISSE" active={activeTab === 'CAISSE'} onClick={() => onTabChange?.('CAISSE')} dark={isRestaurateur} />
        <SidebarLink icon={<MapIcon />} label="PLAN" active={activeTab === 'PLAN'} onClick={() => onTabChange?.('PLAN')} dark={isRestaurateur} />
        <SidebarLink icon={<Calendar />} label="RESA" active={activeTab === 'RESERVATIONS'} onClick={() => onTabChange?.('RESERVATIONS')} dark={isRestaurateur} />
        {isRestaurateur && <SidebarLink icon={<Bell />} label="CUISINE" href="/kds" dark={isRestaurateur} />}
        <SidebarLink icon={<Settings />} label="GESTION" href="/restaurateur/produits" dark={isRestaurateur} />
      </div>
      <div className="flex flex-col gap-8 w-full items-center">
        <SidebarLink icon={<User />} label="PROFIL" onClick={() => setShowSessionStats(true)} dark={isRestaurateur} />
        <SidebarLink icon={<LogOut />} label="QUITTER" onClick={() => signOut({ callbackUrl: '/login' })} dark={isRestaurateur} />
      </div>
    </aside>
  )
}

function SidebarLink({ icon, active, label, href, onClick, dark }: { icon: React.ReactNode, active?: boolean, label: string, href?: string, onClick?: () => void, dark?: boolean }) {
  const content = (
    <div onClick={onClick} className={`flex flex-col items-center gap-1.5 cursor-pointer group px-2`}>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
        active 
          ? (dark ? 'bg-white text-[#1a1d24] shadow-[0_8px_20px_rgba(255,255,255,0.2)]' : 'bg-[#212529] text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] scale-105') 
          : (dark ? 'text-white/40 group-hover:text-white group-hover:bg-white/5' : 'text-[#adb5bd] hover:text-[#212529] hover:bg-[#f8f9fa]')
      }`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-[0.1em] transition-colors ${active ? (dark ? 'text-white' : 'text-[#212529]') : (dark ? 'text-white/30' : 'text-[#adb5bd]')}`}>{label}</span>
    </div>
  )
  return href ? <Link href={href} className="w-full no-underline">{content}</Link> : content
}
