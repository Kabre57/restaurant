'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Truck
} from 'lucide-react'

export default function RestaurateurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [store, setStore] = useState<any>(null)

  useEffect(() => {
    if (session?.user?.storeId) {
      getStoreDetails(session.user.storeId).then(data => {
        if (data) setStore(data)
      })
    }
  }, [session])

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
  ]

  return (
    <div className="flex h-screen bg-[#f1f3f5] text-[#212529] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-[#1a1d24] text-white flex flex-col shadow-2xl z-30 transition-all border-r border-white/5">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-lg">
            <Store className="w-6 h-6 text-white" />
          </div>
          <span className="font-black tracking-tighter text-lg uppercase hidden lg:block text-white">Restaurateur</span>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-4">
          {menuItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${active
                  ? 'bg-white text-[#1a1d24] shadow-xl shadow-black/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
                <span className="font-black text-[10px] uppercase tracking-widest hidden lg:block">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto space-y-2">
          <Link
            href="/"
            className="flex items-center gap-4 px-4 py-3 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-black text-[10px] uppercase tracking-widest hidden lg:block">Retour POS</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-white/40 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/5 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-black text-[10px] uppercase tracking-widest hidden lg:block">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-[#dee2e6] flex items-center justify-between px-10 z-20">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Espace Gestion Restaurant</span>
            <div className="h-4 w-px bg-[#dee2e6]" />
            <h2 className="text-xs font-black text-[#212529] uppercase tracking-tight">{store?.name || 'Chargement...'}</h2>
          </div>
          <div className="flex items-center gap-4">
            {store?.logo ? (
              <img src={store.logo} alt="Logo" className="w-10 h-10 rounded-xl object-contain border border-[#dee2e6] bg-white" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] flex items-center justify-center">
                <Store className="w-5 h-5 text-[#adb5bd]" />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8f9fa]">
          {children}
        </main>
      </div>
    </div>
  )
}
