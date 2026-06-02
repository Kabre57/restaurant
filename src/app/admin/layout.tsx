'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { getStores } from '@/app/actions/stores'
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
  ChevronDown,
  MessageSquare,
  Users,
  Layers,
  Archive,
  PlusSquare,
  ShieldCheck,
} from 'lucide-react'

type StoreSummary = {
  id: string
  name: string
}

const generalItems = [
  { name: 'Tableau de bord', icon: <LayoutDashboard />, href: '/admin/dashboard' },
  { name: 'Supervision Multi-sites', icon: <ShieldCheck />, href: '/admin/supervision' },
  { name: 'Superviseur', icon: <UserCog />, href: '/admin/superviseur' },
  { name: 'Restaurants', icon: <Building2 />, href: '/admin/restaurants' },
  { name: 'Clients', icon: <Users />, href: '/admin/clients' },
  { name: 'Utilisateurs', icon: <UserCog />, href: '/admin/utilisateurs' },
  { name: 'Analytique', icon: <BarChart3 />, href: '/admin/analytics' },
  { name: 'Finances', icon: <Wallet />, href: '/admin/finances' },
]

const gestionItems = [
  { name: 'Promotions', icon: <Compass />, href: '/admin/promotions' },
  { name: 'Configuration', icon: <Settings />, href: '/admin/config' },
  { name: 'Support', icon: <LifeBuoy />, href: '/admin/support' },
  { name: 'Espaces', icon: <Compass />, href: '/espaces' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [stores, setStores] = useState<StoreSummary[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')

  // Helpers pour les cookies
  const setStoreCookie = (storeId: string) => {
    document.cookie = `admin_active_store_id=${storeId}; path=/; max-age=31536000; SameSite=Lax`
  }

  const getStoreCookie = () => {
    const match = document.cookie.match(/(^| )admin_active_store_id=([^;]*)/)
    return match ? match[2] : null
  }

  useEffect(() => {
    getStores().then((data) => {
      if (data && data.length > 0) {
        setStores(data as StoreSummary[])
        const stored = getStoreCookie() || localStorage.getItem('admin_active_store_id')
        const activeId = data.some(s => s.id === stored) ? (stored as string) : data[0].id
        setSelectedStore(activeId)
        if (activeId !== stored) {
          setStoreCookie(activeId)
          localStorage.setItem('admin_active_store_id', activeId)
        }
      }
    })
  }, [])

  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId)
    setStoreCookie(storeId)
    localStorage.setItem('admin_active_store_id', storeId)
    window.location.reload()
  }

  const handleLogout = async () => {
    setIsSidebarOpen(false)
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()
  }

  const activeStoreName = stores.find(s => s.id === selectedStore)?.name || 'Chargement...'

  return (
    <div className="flex h-screen bg-[#F5F6F8] font-sans text-[#171717] overflow-hidden">
      {/* Mobile Sidebar overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#1a1d24]/35 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[18.5rem] flex-col border-r border-[#E5E7EB] bg-white text-[#495057] shadow-lg transition-transform duration-300 lg:static lg:w-[18.5rem] lg:translate-x-0 lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-[#F0F1F6]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6D00] text-white">
              <Package className="h-5.5 w-5.5" />
            </div>
            <span className="text-xl font-black tracking-tight text-[#171717]">Administrateur</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-[#868e96] transition-all hover:bg-[#FF6D00]/10 hover:text-[#FF6D00] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Restaurant selector dropdown */}
        <div className="px-5 py-4 border-b border-[#F0F1F6] bg-[#F8F9FA]/50">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#868e96] mb-2">RESTAURANT ACTIF</p>
          <div className="relative">
            <select
              value={selectedStore}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-[#E5E7EB] bg-white py-3 pl-4 pr-10 text-xs font-bold text-[#171717] outline-none cursor-pointer focus:border-[#FF6D00] transition-colors"
            >
              {stores.length === 0 ? (
                <option>Le Burger Doré - Paris 1er</option>
              ) : (
                stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-[#868e96]" />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {/* VUE GENERALE */}
          <div>
            <p className="px-4 text-[9px] font-black uppercase tracking-widest text-[#adb5bd] mb-2">VUE GÉNÉRALE</p>
            <nav className="space-y-1">
              {generalItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${active
                      ? 'bg-[#FF6D00]/10 text-[#FF6D00]'
                      : 'text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#171717]'
                      }`}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5 shrink-0' })}
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* GESTION */}
          <div>
            <p className="px-4 text-[9px] font-black uppercase tracking-widest text-[#adb5bd] mb-2">GESTION</p>
            <nav className="space-y-1">
              {gestionItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${active
                      ? 'bg-[#FF6D00]/10 text-[#FF6D00]'
                      : 'text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#171717]'
                      }`}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5 shrink-0' })}
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Logout at bottom */}
        <div className="p-4 border-t border-[#F0F1F6]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#e03131] transition-all hover:bg-[#fff5f5]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-20 items-center justify-between gap-4 bg-white px-8 shadow-sm border-b border-[#E5E7EB] shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] transition-all hover:bg-[#FF6D00]/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 items-center gap-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] px-4 py-2.5 md:flex md:w-[20rem] lg:w-[24rem]">
              <Search className="h-4.5 w-4.5 text-[#adb5bd]" />
              <input
                type="text"
                placeholder="Recherche..."
                className="w-full bg-transparent text-xs font-semibold text-[#171717] outline-none placeholder-[#adb5bd]"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative rounded-xl p-2 text-[#868e96] hover:bg-[#F8F9FA] transition-all">
              <MessageSquare className="h-5 w-5" />
            </button>

            <button className="relative rounded-xl p-2 text-[#868e96] hover:bg-[#F8F9FA] transition-all">
              <Bell className="h-5 w-5" />
              <div className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-[#e03131]" />
            </button>

            <div className="h-8 w-[1px] bg-[#E5E7EB]" />

            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-xs font-black text-[#171717]">Utilisateur administrateur</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#868e96]">Superadministrateur</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6D00] text-xs font-black text-white shadow-md shadow-orange-500/10">
                AU
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F5F6F8] p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
