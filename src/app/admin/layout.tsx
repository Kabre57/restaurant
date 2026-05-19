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
  Building2,
  Bell,
  Menu,
  X,
  Search,
  Compass,
  UserCog,
} from 'lucide-react'

const menuItems = [
  { name: 'Tableau de bord', icon: <LayoutDashboard />, href: '/admin/dashboard' },
  { name: 'Franchiseurs', icon: <UserCog />, href: '/admin/franchiseurs' },
  { name: 'Restaurants', icon: <Building2 />, href: '/admin/restaurants' },
  { name: 'Finances', icon: <Wallet />, href: '/admin/finances' },
  { name: 'Analytics', icon: <BarChart3 />, href: '/admin/analytics' },
  { name: 'Promotions', icon: <Package />, href: '/admin/promotions' },
  { name: 'Configuration', icon: <Settings />, href: '/admin/config' },
  { name: 'Support', icon: <LifeBuoy />, href: '/admin/support' },
  { name: 'Espaces', icon: <Compass />, href: '/admin/espaces' },
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
    <div className="flex min-h-screen bg-[#eeeeee] font-sans text-[var(--parabellum-text)]">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#1a1d24]/35 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[88vw] flex-col border-r border-[#f0f1f6] bg-white text-[var(--parabellum-text)] shadow-2xl transition-transform duration-300 lg:static lg:w-[18.5rem] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[6.25rem] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="parabellum-gradient flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#343957]">ParabellumPOS</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-[var(--parabellum-muted)] transition-all hover:bg-[#eef1ff] hover:text-[var(--parabellum-primary)] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-0 py-4">
          {menuItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`relative mx-0 flex items-center gap-4 border-l-[0.35rem] px-7 py-3.5 text-[0.94rem] font-semibold transition-all ${
                  active
                    ? 'border-[var(--parabellum-primary)] bg-[#eef1ff] text-[var(--parabellum-primary)]'
                    : 'border-transparent text-[#8a92a6] hover:bg-[#f7f8ff] hover:text-[var(--parabellum-primary)]'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto p-5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#8a92a6] transition-all hover:bg-[#fff0f3] hover:text-[var(--parabellum-danger)]"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[6.25rem] items-center justify-between gap-4 bg-white px-4 py-3 shadow-sm md:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--parabellum-border)] bg-white text-[var(--parabellum-primary)] transition-all hover:bg-[#eef1ff] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 items-center gap-3 rounded-2xl bg-[#f3f3f3] px-5 py-3 md:flex md:w-[20rem] lg:w-[25rem]">
              <span className="flex h-7 w-7 items-center justify-center text-[var(--parabellum-muted)]">
                <Search className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-[#8a92a6]">Rechercher ici...</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative rounded-xl p-2 text-[var(--parabellum-muted)] transition-all hover:bg-[#eef1ff] hover:text-[var(--parabellum-primary)]">
              <Bell className="h-5 w-5" />
              <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-[var(--parabellum-danger)]" />
            </button>

            <div className="hidden items-center overflow-hidden rounded-l-[2rem] bg-[var(--parabellum-primary)] pl-6 text-white shadow-lg sm:flex">
              <div className="flex flex-col items-end py-3 pr-4">
                <span className="text-sm font-black">Bonjour Admin</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">Franchiseur</span>
              </div>
              <div className="h-14 w-14 rounded-l-[2rem] border-4 border-white/20 bg-white/20" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#eeeeee] px-4 py-8 md:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
