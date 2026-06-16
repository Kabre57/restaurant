'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { getStores } from '@/app/actions/store/stores'
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
  ClipboardList,
  Layers,
  LayoutGrid,
  Menu,
  X,
  Search,
  Compass,
  UserCog,
  ChevronDown,
  MessageSquare,
  Users,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  Moon,
  ShieldCheck,
  Ticket,
  CreditCard,
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
  { name: 'Analytique', icon: <BarChart3 />, href: '/admin/analytics' },
  { name: 'Finances', icon: <Wallet />, href: '/admin/finances' },
]

const restaurantItems = [
  { name: 'Commandes', icon: <ClipboardList />, href: '/admin/commandes' },
  { name: 'Produits', icon: <ShoppingBag />, href: '/admin/produits' },
  { name: 'Catégories', icon: <Layers />, href: '/admin/categories' },
  { name: 'Modificateurs', icon: <SlidersHorizontal />, href: '/admin/supplements' },
  { name: 'Promotions', icon: <Ticket />, href: '/admin/promotions' },
  { name: 'Tables', icon: <LayoutGrid />, href: '/admin/tables' },
  { name: 'Paiements', icon: <CreditCard />, href: '/admin/config/paiements' },
  { name: 'Inventaire', icon: <Package />, href: '/admin/inventaire' },
  { name: 'Clients', icon: <Users />, href: '/admin/clients' },
  { name: 'Utilisateurs', icon: <UserCog />, href: '/admin/utilisateurs' },
]

const gestionItems = [
  { name: 'Notifications', icon: <Bell />, href: '/admin/notifications' },
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
  const [isDarkMode, setIsDarkMode] = useState(false)

  // theme init and sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('admin_theme')
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark')
      } else {
        const savedRestaurateur = localStorage.getItem('restaurateur_theme')
        const initialDark = savedRestaurateur === 'dark'
        setIsDarkMode(initialDark)
        localStorage.setItem('admin_theme', initialDark ? 'dark' : 'light')
      }
    }
  }, [])

  // Sync theme switch across tabs/namespaces
  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('admin_theme') || localStorage.getItem('restaurateur_theme')
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const toggleTheme = () => {
    const nextVal = !isDarkMode
    setIsDarkMode(nextVal)
    localStorage.setItem('admin_theme', nextVal ? 'dark' : 'light')
    localStorage.setItem('restaurateur_theme', nextVal ? 'dark' : 'light')
    
    // Dispatch storage event to sync other pages/tabs
    window.dispatchEvent(new Event('storage'))
  }

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

  return (
    <div className={`barab-shell flex h-screen overflow-hidden bg-[var(--parabellum-body)] font-sans text-[var(--parabellum-text)] ${isDarkMode ? 'dark' : ''}`}>
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
        className={`barab-sidebar fixed inset-y-0 left-0 z-40 flex w-[18.5rem] flex-col border-r border-[rgba(255,255,255,0.08)] text-white/75 shadow-[0_24px_48px_rgba(18,18,18,0.22)] transition-transform duration-300 lg:static lg:w-[18.5rem] lg:translate-x-0 lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1rem] border border-white/10 bg-black/90 p-1 shadow-[0_14px_28px_rgba(0,0,0,0.22)]">
              <Image
                src="/logo.jpg"
                alt="Progiteck"
                width={128}
                height={128}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <span className="block text-lg font-bold uppercase tracking-[0.08em] text-white">Administrateur</span>
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/55">
                Console de pilotage
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-[#868e96] transition-all hover:bg-[#FF6D00]/10 hover:text-[#FF6D00] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Restaurant selector dropdown */}
        <div className="px-5 py-4 border-b border-[#F0F1F6] dark:border-[#2e3440] bg-[#F8F9FA]/50 dark:bg-[#181a20]/50">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#868e96] dark:text-[#8c96a5] mb-2">RESTAURANT ACTIF</p>
          <div className="relative">
            <select
              value={selectedStore}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-[#E5E7EB] bg-white py-3 pl-4 pr-10 text-xs font-bold text-[#171717] dark:border-[#2e3440] dark:bg-[#181a20] dark:text-white outline-none cursor-pointer focus:border-[#FF6D00] transition-colors"
            >
              {stores.length === 0 ? (
                <option>Le Burger Doré - Paris 1er</option>
              ) : (
                stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-[#868e96] dark:text-[#8c96a5]" />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {/* VUE GENERALE */}
          <div>
            <p className="px-4 text-[9px] font-black uppercase tracking-widest text-[#adb5bd] dark:text-[#8c96a5] mb-2">VUE GÉNÉRALE</p>
            <nav className="space-y-1">
              {generalItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${active
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/55 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5 shrink-0' })}
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* RESTAURANT ACTIF */}
          <div>
            <p className="px-4 text-[9px] font-black uppercase tracking-widest text-[#adb5bd] dark:text-[#8c96a5] mb-2">RESTAURANT ACTIF</p>
            <nav className="space-y-1">
              {restaurantItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${active
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/55 hover:bg-white/5 hover:text-white'
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
            <p className="px-4 text-[9px] font-black uppercase tracking-widest text-[#adb5bd] dark:text-[#8c96a5] mb-2">GESTION</p>
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
                      : 'text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#171717] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white'
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
        <div className="p-4 border-t border-[#F0F1F6] dark:border-[#2e3440]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#ff8b8b] transition-all hover:bg-white/5 hover:text-[#ffd2d2]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="barab-topbar flex h-20 shrink-0 items-center justify-between gap-4 px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] dark:border-[#2e3440] dark:bg-[#181a20] dark:text-[#eceff4] transition-all hover:bg-[#FF6D00]/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 items-center gap-3 rounded-xl bg-[#F8F9FA] dark:bg-[#0f1115] border border-[#E5E7EB] dark:border-[#2e3440] px-4 py-2.5 md:flex md:w-[20rem] lg:w-[24rem]">
              <Search className="h-4.5 w-4.5 text-[#adb5bd] dark:text-[#8c96a5]" />
              <input
                type="text"
                placeholder="Recherche..."
                className="w-full bg-transparent text-xs font-semibold text-[#171717] dark:text-white outline-none placeholder-[#adb5bd]"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] dark:border-[#2e3440] dark:bg-[#181a20] dark:text-[#eceff4] transition-all hover:bg-[#F8F9FA]"
              title={isDarkMode ? 'Passer au Mode Clair' : 'Passer au Mode Sombre'}
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-400" />}
            </button>

            <button className="relative rounded-xl p-2 text-[#868e96] dark:text-white/60 hover:bg-[#F8F9FA] dark:hover:bg-white/10 transition-all">
              <MessageSquare className="h-5 w-5" />
            </button>

            <button className="relative rounded-xl p-2 text-[#868e96] dark:text-white/60 hover:bg-[#F8F9FA] dark:hover:bg-white/10 transition-all">
              <Bell className="h-5 w-5" />
              <div className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-[#e03131]" />
            </button>

            <div className="h-8 w-[1px] bg-[#E5E7EB] dark:bg-[#2e3440]" />

            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-xs font-black text-[#171717] dark:text-white">Utilisateur administrateur</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#868e96] dark:text-[#8c96a5]">Superadministrateur</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-sm dark:border-[#2e3440] dark:bg-[#181a20]">
                <Image
                  src="/logo.svg"
                  alt="Progiteck"
                  width={28}
                  height={28}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[var(--parabellum-body)] p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
