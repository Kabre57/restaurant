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
  LifeBuoy,
  ChevronDown,
  ChevronRight,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
  Star,
  PlusSquare,
  Coins,
  Key,
  SlidersHorizontal,
  History,
  ChefHat,
  Building,
  Tag,
} from 'lucide-react'

type StoreSummary = {
  name?: string | null
  logo?: string | null
}

const menuItems = [
  { name: 'Performance', icon: <TrendingUp />, href: '/restaurateur/stats', roles: ['RESTAURATEUR', 'MANAGER'] },
  {
    name: 'Menu',
    icon: <UtensilsCrossed />,
    href: '/restaurateur/menu',
    roles: ['RESTAURATEUR', 'MANAGER'],
    subItems: [
      { name: 'Articles', href: '/restaurateur/produits', icon: <UtensilsCrossed />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Catégories', href: '/restaurateur/categories', icon: <Layers />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Suppléments', href: '/restaurateur/supplements', icon: <PlusSquare />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Modificateurs', href: '/restaurateur/modificateurs', icon: <SlidersHorizontal />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Réductions', href: '/restaurateur/reductions', icon: <Tag />, roles: ['RESTAURATEUR', 'MANAGER'] }
    ]
  },
  {
    name: 'Stocks',
    icon: <Package />,
    href: '/restaurateur/stocks',
    roles: ['RESTAURATEUR', 'MANAGER', 'CHEF'],
    subItems: [
      { name: 'Les bons de commande', href: '/restaurateur/stocks/purchase-orders', icon: <ClipboardList />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Ordres de transfert', href: '/restaurateur/stocks/transfers', icon: <Truck />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Ajustements des stocks', href: '/restaurateur/stocks/adjustments', icon: <SlidersHorizontal />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Inventaires des stocks', href: '/restaurateur/stocks/physical-inventory', icon: <LayoutGrid />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Les productions', href: '/restaurateur/stocks/productions', icon: <ChefHat />, roles: ['RESTAURATEUR', 'MANAGER', 'CHEF'] },
      { name: 'Fournisseurs', href: '/restaurateur/stocks/suppliers', icon: <Building />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Historique des stocks', href: '/restaurateur/stocks/history', icon: <History />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Évaluation des stocks', href: '/restaurateur/stocks/valuation', icon: <TrendingUp />, roles: ['RESTAURATEUR', 'MANAGER'] }
    ]
  },
  { name: 'Plan de Salle', icon: <LayoutGrid />, href: '/restaurateur/tables', roles: ['RESTAURATEUR', 'MANAGER'] },
  { name: 'Commandes', icon: <ClipboardList />, href: '/restaurateur/commandes', roles: ['RESTAURATEUR', 'MANAGER', 'WAITER', 'CASHIER'] },
  { name: 'Rotation Caisse', icon: <Coins />, href: '/restaurateur/caisse/rotation', roles: ['RESTAURATEUR', 'MANAGER', 'CASHIER'] },
  { name: 'Livraisons', icon: <Truck />, href: '/restaurateur/livraisons', roles: ['RESTAURATEUR', 'MANAGER'] },
  {
    name: 'Personnel',
    icon: <Users />,
    href: '/restaurateur/staff',
    roles: ['RESTAURATEUR', 'MANAGER'],
    subItems: [
      { name: 'Liste des employés', href: '/restaurateur/staff', icon: <Users />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Droits d\'accès', href: '/restaurateur/staff/rights', icon: <Key />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Fiches de présence', href: '/restaurateur/staff/presence', icon: <FileText />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Heures totales travaillées', href: '/restaurateur/staff/hours', icon: <TrendingUp />, roles: ['RESTAURATEUR', 'MANAGER'] }
    ]
  },
  {
    name: 'Ressources Humaines',
    icon: <Users />,
    href: '/restaurateur/rh',
    roles: ['ALL'], // Accessible to everyone, but sub-items filtered
    subItems: [
      { name: 'Dashboard RH', href: '/restaurateur/rh/dashboard', icon: <LayoutGrid />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Effectifs', href: '/restaurateur/rh/effectifs', icon: <Briefcase />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Mes Contrats', href: '/restaurateur/rh/contrats', icon: <FileText />, roles: ['ALL'] },
      { name: 'Mes Bulletins', href: '/restaurateur/rh/paie', icon: <DollarSign />, roles: ['ALL'] },
      { name: 'Mes Congés', href: '/restaurateur/rh/conges', icon: <Calendar />, roles: ['ALL'] },
      { name: 'Avances & Prêts', href: '/restaurateur/rh/avances-prets', icon: <CreditCard />, roles: ['ALL'] },
      { name: 'Évaluations', href: '/restaurateur/rh/evaluations', icon: <Star />, roles: ['ALL'] },
      { name: 'Configuration', href: '/restaurateur/rh/configuration', icon: <Settings />, roles: ['RESTAURATEUR', 'MANAGER'] },
    ],
  },
  { name: 'Support', icon: <LifeBuoy />, href: '/restaurateur/support', roles: ['ALL'] },
  { name: 'Réglages', icon: <Settings />, href: '/restaurateur/config', roles: ['RESTAURATEUR'] },
  { name: 'Clés API', icon: <Key />, href: '/restaurateur/integrations/api-tokens', roles: ['RESTAURATEUR'] },
  { name: 'Espaces', icon: <Compass />, href: '/espaces', roles: ['ALL'] },
]

export default function RestaurateurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [store, setStore] = useState<StoreSummary | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '/restaurateur/rh': pathname.startsWith('/restaurateur/rh'),
    '/restaurateur/stocks': pathname.startsWith('/restaurateur/stocks'),
    '/restaurateur/staff': pathname.startsWith('/restaurateur/staff'),
    '/restaurateur/menu': pathname.startsWith('/restaurateur/produits') || 
                         pathname.startsWith('/restaurateur/categories') || 
                         pathname.startsWith('/restaurateur/supplements') || 
                         pathname.startsWith('/restaurateur/modificateurs') || 
                         pathname.startsWith('/restaurateur/reductions')
  })

  useEffect(() => {
    console.log("[RestaurateurLayout Session Client]", session)
    if (!session?.user?.storeId) return

    let isCancelled = false

    getStoreDetails(session.user.storeId).then((data) => {
      if (isCancelled) return
      if (!data) {
        // Session obsolète après réinitialisation de la BDD
        void signOut({ callbackUrl: '/login' })
        return
      }
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
    <div className="parabellum-shell flex min-h-screen font-sans">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f1115]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`parabellum-sidebar fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[88vw] flex-col border-r border-white/5 shadow-2xl transition-transform duration-300 lg:static lg:w-20 lg:max-w-none lg:translate-x-0 xl:w-64 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 lg:justify-center lg:p-6 xl:justify-start xl:p-8">
          <div className="flex items-center gap-3">
            <div className="parabellum-gradient flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg">
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

        <nav className="flex-1 overflow-y-auto space-y-1.5 px-4 py-6 lg:px-3 xl:px-4">
          {menuItems.map((item) => {
            const userRole = session?.user?.role || 'RESTAURATEUR'
            let filteredSubItems = item.subItems

            if (filteredSubItems) {
              // Si c'est un compte manager/restaurateur, on renomme pour un style plus professionnel
              if (userRole === 'RESTAURATEUR' || userRole === 'MANAGER' || userRole === 'ADMIN') {
                filteredSubItems = filteredSubItems.map(sub => {
                  if (sub.name === 'Mes Contrats') return { ...sub, name: 'Contrats' }
                  if (sub.name === 'Mes Bulletins') return { ...sub, name: 'Paie & Salaires' }
                  if (sub.name === 'Mes Congés') return { ...sub, name: 'Gestion des Congés' }
                  return sub
                })
              }
            }

            const isActive = pathname.startsWith(item.href) && (!filteredSubItems || pathname === item.href)
            const isExpanded = expandedMenus[item.href] || false

            return (
              <div key={item.href}>
                <div
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[var(--parabellum-primary)] shadow-md shadow-black/10 font-bold'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => {
                    if (filteredSubItems) {
                      setExpandedMenus((prev) => ({ ...prev, [item.href]: !prev[item.href] }))
                    } else {
                      router.push(item.href)
                      setIsSidebarOpen(false)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4 shrink-0' })}
                    <span className="text-[11px] font-bold uppercase tracking-wider lg:hidden xl:block">{item.name}</span>
                  </div>
                  {filteredSubItems && (
                    <div className="lg:hidden xl:block">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  )}
                </div>

                {filteredSubItems && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1 lg:hidden xl:block">
                    {filteredSubItems.map((subItem) => {
                      const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                            isSubActive
                              ? 'bg-white/15 text-white font-bold'
                              : 'text-white/50 hover:bg-white/10 hover:text-white/90'
                          }`}
                        >
                          {React.cloneElement(subItem.icon as React.ReactElement<{ className?: string }>, { className: 'h-3.5 w-3.5 shrink-0 opacity-70' })}
                          <span className="text-[10px] font-semibold uppercase tracking-wider">{subItem.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="mt-auto space-y-2 p-4 lg:px-3 xl:px-4">
          <Link
            href="/"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-4 rounded-2xl px-4 py-3 text-white/55 transition-all hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest lg:hidden xl:block">Retour POS</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-white/55 transition-all hover:bg-white/10 hover:text-[var(--parabellum-danger)]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest lg:hidden xl:block">Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="parabellum-topbar flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6 lg:min-h-20 lg:px-10">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--parabellum-border)] bg-white text-[var(--parabellum-text)] transition-all hover:bg-[#f8f9ff] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <span className="parabellum-kicker block truncate">
                Espace Gestion Restaurant
              </span>
              <h2 className="mt-1 truncate text-xs font-black uppercase tracking-tight text-[var(--parabellum-text)]">
                {store?.name || 'Chargement...'}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {store?.logo ? (
              <div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-xl border border-[var(--parabellum-border)] bg-white px-2 shadow-sm sm:h-11 sm:w-16">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--parabellum-border)] bg-white shadow-sm">
                <Store className="h-5 w-5 text-[var(--parabellum-muted)]" />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
