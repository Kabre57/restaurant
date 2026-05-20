'use client'

import React from 'react'
import { Utensils, LayoutGrid, Bell, Settings, User, LogOut, Calendar, Map as MapIcon, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  isRestaurateur: boolean
  operatorRole?: 'CASHIER' | 'SERVER'
  setShowSessionStats: (val: boolean) => void
  activeTab?: string
  onTabChange?: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({
  isRestaurateur,
  operatorRole = 'CASHIER',
  setShowSessionStats,
  activeTab,
  onTabChange,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const router = useRouter()
  const primaryLabel = operatorRole === 'SERVER' ? 'SERVICE' : 'CAISSE'
  const baseStyles = isRestaurateur
    ? 'bg-[#1a1d24] border-white/5 text-white shadow-2xl'
    : 'bg-white border-[#e9ecef] text-[#1a1d24]'

  const handleLogout = async () => {
    onClose?.()
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-[#0f1115]/55 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] max-w-[86vw] flex-col justify-between border-r px-4 py-6 shadow-sm transition-transform duration-300 lg:static lg:w-20 lg:max-w-none lg:translate-x-0 lg:items-center lg:px-0 lg:py-8 ${baseStyles} ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex w-full flex-col gap-6 lg:items-center">
          <div className="flex items-center justify-between lg:flex-col lg:gap-2">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${isRestaurateur ? 'bg-white/10' : 'bg-[#FF6D00] shadow-orange-500/20'}`}>
              <Utensils className="h-6 w-6 text-white" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl p-2 transition-all lg:hidden ${isRestaurateur ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-[#adb5bd] hover:bg-[#f8f9fa] hover:text-[#212529]'}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-4 lg:w-full lg:items-center">
            <SidebarLink icon={<LayoutGrid />} label={primaryLabel} active={activeTab === 'CAISSE'} onClick={() => { onTabChange?.('CAISSE'); onClose?.() }} dark={isRestaurateur} expanded />
            <SidebarLink icon={<MapIcon />} label="PLAN" active={activeTab === 'PLAN'} onClick={() => { onTabChange?.('PLAN'); onClose?.() }} dark={isRestaurateur} expanded />
            <SidebarLink icon={<Calendar />} label="RESA" active={activeTab === 'RESERVATIONS'} onClick={() => { onTabChange?.('RESERVATIONS'); onClose?.() }} dark={isRestaurateur} expanded />
            {isRestaurateur && <SidebarLink icon={<Bell />} label="CUISINE" href="/kds" dark={isRestaurateur} expanded onNavigate={onClose} />}
            <SidebarLink icon={<Settings />} label="GESTION" href="/restaurateur/produits" dark={isRestaurateur} expanded onNavigate={onClose} />
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col gap-4 lg:items-center">
          <SidebarLink icon={<User />} label="PROFIL" onClick={() => { setShowSessionStats(true); onClose?.() }} dark={isRestaurateur} expanded />
          <SidebarLink icon={<LogOut />} label="QUITTER" onClick={handleLogout} dark={isRestaurateur} expanded />
        </div>
      </aside>
    </>
  )
}

function SidebarLink({
  icon,
  active,
  label,
  href,
  onClick,
  dark,
  expanded,
  onNavigate,
}: {
  icon: React.ReactNode
  active?: boolean
  label: string
  href?: string
  onClick?: () => void
  dark?: boolean
  expanded?: boolean
  onNavigate?: () => void
}) {
  const rowStyles = expanded ? 'flex-row justify-start gap-3 px-4 py-3 lg:flex-col lg:justify-center lg:gap-1.5 lg:px-2' : 'flex-col items-center gap-1.5 px-2'

  const content = (
    <div onClick={onClick} className={`flex w-full cursor-pointer items-center rounded-2xl group ${rowStyles}`}>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
          active
            ? dark
              ? 'bg-white text-[#1a1d24] shadow-[0_8px_20px_rgba(255,255,255,0.2)]'
              : 'bg-[#FF6D00] text-white shadow-[0_8px_20px_rgba(255,109,0,0.2)] scale-105'
            : dark
              ? 'text-white/40 group-hover:bg-white/5 group-hover:text-white'
              : 'text-[#adb5bd] hover:bg-[#f8f9fa] hover:text-[#212529]'
        }`}
      >
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
      </div>
      <span
        className={`text-[10px] font-black uppercase tracking-[0.14em] transition-colors lg:text-[8px] ${
          active ? (dark ? 'text-white' : 'text-[#FF6D00]') : dark ? 'text-white/50' : 'text-[#adb5bd]'
        }`}
      >
        {label}
      </span>
    </div>
  )

  return href ? (
    <Link href={href} onClick={onNavigate} className="w-full no-underline lg:w-auto">
      {content}
    </Link>
  ) : (
    content
  )
}
