'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  Layers, 
  Wallet, 
  BarChart3, 
  Settings, 
  LifeBuoy, 
  LogOut,
  Package,
  Bell
} from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const menuItems = [
    { name: 'Tableau de bord', icon: <LayoutDashboard />, href: '/admin/dashboard' },
    { name: 'Finances', icon: <Wallet />, href: '/admin/finances' },
    { name: 'Analytics', icon: <BarChart3 />, href: '/admin/analytics' },
    { name: 'Promotions', icon: <Package />, href: '/admin/promotions' },
    { name: 'Configuration', icon: <Settings />, href: '/admin/config' },
    { name: 'Support', icon: <LifeBuoy />, href: '/admin/support' },
  ]

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-[#212529] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#212529] text-white flex flex-col shadow-2xl z-30">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <span className="font-black tracking-widest text-lg uppercase">Supervision</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest ${
                  active 
                    ? 'bg-white text-[#212529] shadow-lg' 
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-[#dee2e6] flex items-center justify-between px-8 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-[#adb5bd] uppercase tracking-widest">Espace Administration</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-[#adb5bd] hover:text-[#212529] transition-all">
              <Bell className="w-5 h-5" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e03131] rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-[#212529]">Admin Superviseur</span>
                <span className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-widest">Niveau 1</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#f1f3f5] border border-[#dee2e6]" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#f8f9fa]">
          {children}
        </main>
      </div>
    </div>
  )
}
