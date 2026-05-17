'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  Settings,
  LifeBuoy,
  LogOut,
  Package,
  Bell,
  Menu,
  X,
  Compass,
} from 'lucide-react'

const menuItems = [
  { name: 'Tableau de bord', icon: <LayoutDashboard />, href: '/admin/dashboard' },
  { name: 'Finances', icon: <Wallet />, href: '/admin/finances' },
  { name: 'Analytics', icon: <BarChart3 />, href: '/admin/analytics' },
  { name: 'Promotions', icon: <Package />, href: '/admin/promotions' },
  { name: 'Configuration', icon: <Settings />, href: '/admin/config' },
  { name: 'Support', icon: <LifeBuoy />, href: '/admin/support' },
  { name: 'Espaces', icon: <Compass />, href: '/espaces' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = async () => {
    setIsSidebarOpen(false)
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] text-[#212529] font-sans">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#1a1d24]/55 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[88vw] flex-col bg-[#212529] text-white shadow-2xl transition-transform duration-300 lg:static lg:w-64 lg:max-w-none lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-black uppercase tracking-widest">Supervision</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-3">
          {menuItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
                  active
                    ? 'bg-white text-[#212529] shadow-lg'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[#dee2e6] bg-white px-4 py-3 shadow-sm md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] text-[#212529] transition-all hover:bg-[#f1f3f5] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-widest text-[#adb5bd]">
                Espace Franchiseur
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative rounded-xl p-2 text-[#adb5bd] transition-all hover:text-[#212529]">
              <Bell className="h-5 w-5" />
              <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-[#e03131]" />
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-[#212529]">Admin Superviseur</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#adb5bd]">Niveau 1</span>
              </div>
              <div className="h-9 w-9 rounded-full border border-[#dee2e6] bg-[#f1f3f5]" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8f9fa] p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
