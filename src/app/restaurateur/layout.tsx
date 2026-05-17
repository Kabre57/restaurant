'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { getStoreDetails } from '@/app/actions/stores'
import {
  Store,
  UtensilsCrossed,
  ClipboardList,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  LayoutGrid,
  Layers,
  Package,
  Truck,
  Menu,
  X,
  Compass,
} from 'lucide-react'

type StoreSummary = {
  name?: string | null
  logo?: string | null
}

const menuItems = [
  { name: 'Performance', icon: <TrendingUp />, href: '/restaurateur/stats' },
  { name: 'Menu', icon: <UtensilsCrossed />, href: '/restaurateur/produits' },
  { name: 'Stocks', icon: <Package />, href: '/restaurateur/stocks' },
  { name: 'Catégories', icon: <Layers />, href: '/restaurateur/categories' },
  { name: 'Plan de Salle', icon: <LayoutGrid />, href: '/restaurateur/tables' },
  { name: 'Commandes', icon: <ClipboardList />, href: '/restaurateur/commandes' },
  { name: 'Livraisons', icon: <Truck />, href: '/restaurateur/livraisons' },
  { name: 'Personnel', icon: <Users />, href: '/restaurateur/staff' },
  { name: 'Réglages', icon: <Settings />, href: '/restaurateur/config' },
  { name: 'Espaces', icon: <Compass />, href: '/espaces' },
]

export default function RestaurateurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [store, setStore] = useState<StoreSummary | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!session?.user?.storeId) return

    let isCancelled = false

    getStoreDetails(session.user.storeId).then((data) => {
      if (isCancelled || !data) return
      setStore(data as StoreSummary)
    })

    return () => {
      isCancelled = true
    }
  }, [session?.user?.storeId])

  const handleLogout = async () => {
    setIsSidebarOpen(false)
    await signOut({ redirect: false })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-[#f1f3f5] text-[#212529] font-sans">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f1115]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[88vw] flex-col border-r border-white/5 bg-[#1a1d24] text-white shadow-2xl transition-transform duration-300 lg:static lg:w-20 lg:max-w-none lg:translate-x-0 xl:w-64 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 lg:justify-center lg:p-6 xl:justify-start xl:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 shadow-lg">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-black uppercase tracking-tighter text-white lg:hidden xl:block">Restaurateur</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-3 px-4 py-6 lg:items-center lg:px-3 xl:px-4">
          {menuItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-all ${
                  active
                    ? 'bg-white text-[#1a1d24] shadow-xl shadow-black/20'
                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5 shrink-0' })}
                <span className="text-[10px] font-black uppercase tracking-widest lg:hidden xl:block">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-2 p-4 lg:px-3 xl:px-4">
          <Link
            href="/"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-4 rounded-2xl px-4 py-3 text-white/40 transition-all hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest lg:hidden xl:block">Retour POS</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-white/40 transition-all hover:bg-[#ff6b6b]/5 hover:text-[#ff6b6b]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest lg:hidden xl:block">Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-[#dee2e6] bg-white px-4 py-3 md:px-6 lg:min-h-20 lg:px-10">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
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
                Espace Gestion Restaurant
              </span>
              <h2 className="mt-1 truncate text-xs font-black uppercase tracking-tight text-[#212529]">
                {store?.name || 'Chargement...'}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {store?.logo ? (
              <div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#dee2e6] bg-white px-2 sm:h-11 sm:w-16">
                <Image
                  src={store.logo}
                  alt="Logo"
                  width={64}
                  height={44}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dee2e6] bg-[#f8f9fa]">
                <Store className="h-5 w-5 text-[#adb5bd]" />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8f9fa] p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
