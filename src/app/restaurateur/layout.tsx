'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { getStoreDetails } from '@/app/actions/store/stores'
import { getStoreSettings } from '@/app/actions/store/storeSettings'
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
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
  Star,
  Coins,
  Key,
  SlidersHorizontal,
  History,
  ChefHat,
  Building,
  Tag,
  Sun,
  Moon,
  Clock,
  BellRing,
  Search,
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
      { name: 'Modificateurs', href: '/restaurateur/supplements', icon: <SlidersHorizontal />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Réductions', href: '/restaurateur/reductions', icon: <Tag />, roles: ['RESTAURATEUR', 'MANAGER'] }
    ]
  },
  {
    name: 'Stocks',
    icon: <Package />,
    href: '/restaurateur/stocks',
    roles: ['RESTAURATEUR', 'MANAGER', 'CHEF'],
    subItems: [
      { name: 'Alertes', href: '/restaurateur/stocks', icon: <BellRing />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Historique', href: '/restaurateur/stocks/history', icon: <History />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Bons de commande', href: '/restaurateur/stocks/purchase-orders', icon: <ClipboardList />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Ordres de transfert', href: '/restaurateur/stocks/transfers', icon: <Truck />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Ajustements', href: '/restaurateur/stocks/adjustments', icon: <SlidersHorizontal />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Inventaires', href: '/restaurateur/stocks/physical-inventory', icon: <LayoutGrid />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Productions', href: '/restaurateur/stocks/productions', icon: <ChefHat />, roles: ['RESTAURATEUR', 'MANAGER', 'CHEF'] },
      { name: 'Fournisseurs', href: '/restaurateur/stocks/suppliers', icon: <Building />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Évaluation', href: '/restaurateur/stocks/valuation', icon: <TrendingUp />, roles: ['RESTAURATEUR', 'MANAGER'] }
    ]
  },
  { name: 'Plan de Salle', icon: <LayoutGrid />, href: '/restaurateur/tables', roles: ['RESTAURATEUR', 'MANAGER'] },
  { name: 'Commandes', icon: <ClipboardList />, href: '/restaurateur/commandes', roles: ['RESTAURATEUR', 'MANAGER', 'WAITER', 'CASHIER'] },
  { name: 'Rotation Caisse', icon: <Coins />, href: '/restaurateur/caisse/rotation', roles: ['RESTAURATEUR', 'MANAGER', 'CASHIER'] },
  { name: 'Livraisons', icon: <Truck />, href: '/restaurateur/livraisons', roles: ['RESTAURATEUR', 'MANAGER'] },
  {
    name: 'Personnel & RH',
    icon: <Users />,
    href: '/restaurateur/rh/dashboard',
    roles: ['ALL'],
    subItems: [
      { name: 'Employés', href: '/restaurateur/rh/effectifs', icon: <Users />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Droits d\'accès', href: '/restaurateur/staff/rights', icon: <Key />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Présences', href: '/restaurateur/staff/presence', icon: <FileText />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Heures de travail', href: '/restaurateur/staff/hours', icon: <Clock />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Dashboard RH', href: '/restaurateur/rh/dashboard', icon: <LayoutGrid />, roles: ['RESTAURATEUR', 'MANAGER'] },
      { name: 'Mes Contrats', href: '/restaurateur/rh/contrats', icon: <FileText />, roles: ['ALL'] },
      { name: 'Mes Bulletins', href: '/restaurateur/rh/paie', icon: <DollarSign />, roles: ['ALL'] },
      { name: 'Mes Congés', href: '/restaurateur/rh/conges', icon: <Calendar />, roles: ['ALL'] },
      { name: 'Avances & Prêts', href: '/restaurateur/rh/avances-prets', icon: <CreditCard />, roles: ['ALL'] },
      { name: 'Évaluations', href: '/restaurateur/rh/evaluations', icon: <Star />, roles: ['ALL'] },
      { name: 'Configuration RH', href: '/restaurateur/rh/configuration', icon: <Settings />, roles: ['RESTAURATEUR', 'MANAGER'] }
    ]
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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [workflowType, setWorkflowType] = useState<string>('SERVER_FIRST')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('restaurateur_theme')
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark')
      } else {
        const savedKDS = localStorage.getItem('kds_theme')
        const initialDark = savedKDS === 'dark'
        setIsDarkMode(initialDark)
        localStorage.setItem('restaurateur_theme', initialDark ? 'dark' : 'light')
      }
    }
  }, [])

  const toggleTheme = () => {
    const nextVal = !isDarkMode
    setIsDarkMode(nextVal)
    localStorage.setItem('restaurateur_theme', nextVal ? 'dark' : 'light')
    
    // Dispatch storage event to sync other pages/tabs
    window.dispatchEvent(new Event('storage'))
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})

  // Load and sync expanded state from localStorage or pathname defaults
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('restaurateur_sidebar_expanded')
        if (saved) {
          setExpandedMenus(JSON.parse(saved))
        } else {
          // Pre-expand sections active by default based on URL path
          const initial: Record<string, boolean> = {}
          menuItems.forEach(item => {
            if (item.subItems) {
              const hasActiveSub = item.subItems.some(sub => 
                pathname === sub.href || pathname.startsWith(sub.href + '/')
              )
              if (hasActiveSub) {
                initial[item.href] = true
              }
            }
          })
          setExpandedMenus(initial)
        }
      } catch (e) {
        console.error('Error loading sidebar expanded state', e)
      }
    }
  }, [pathname])

  // Helper to toggle and persist expanded menus
  const toggleMenuExpanded = (href: string) => {
    setExpandedMenus(prev => {
      const next = { ...prev, [href]: !prev[href] }
      localStorage.setItem('restaurateur_sidebar_expanded', JSON.stringify(next))
      return next
    })
  }

  const userRole = session?.user?.role || 'RESTAURATEUR'
  const hasAccess = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.includes('ALL')) return true
    if (userRole === 'ADMIN') return true
    return allowedRoles.includes(userRole)
  }

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

    getStoreSettings(session.user.storeId).then((res) => {
      if (isCancelled) return
      if (res.success && res.settings) {
        setWorkflowType(res.settings.workflowType)
      }
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
    <div className={`flex h-screen bg-[#F5F6F8] font-sans text-[#171717] overflow-hidden ${isDarkMode ? 'dark bg-[#0f1115] text-[#eceff4]' : ''}`}>
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f1115]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[18.5rem] flex-col border-r border-[#E5E7EB] bg-white text-[#495057] shadow-xl transition-transform duration-300 dark:border-[#2e3440] dark:bg-[#181a20] dark:text-white/60 lg:static lg:w-[18.5rem] lg:translate-x-0 lg:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-[#F0F1F6] dark:border-[#2e3440]">
          <div className="flex items-center gap-3">
            <div className="parabellum-gradient flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg text-white">
              <Store className="h-6 w-6" />
            </div>
            <span className="text-lg font-black uppercase tracking-tighter text-[#171717] dark:text-white">Restaurateur</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-[#868e96] hover:bg-[#FF6D00]/10 hover:text-[#FF6D00] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1.5 px-4 py-6 custom-scrollbar">
          {/* Search bar inside sidebar */}
          <div className="mb-4">
            <div className="flex items-center gap-2 rounded-xl bg-[#F8F9FA] dark:bg-[#181a20]/60 border border-[#E5E7EB] dark:border-[#2e3440] px-3 py-2">
              <Search className="h-3.5 w-3.5 text-[#adb5bd] dark:text-[#8c96a5]" />
              <input
                type="text"
                placeholder="Rechercher un menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] font-semibold text-[#171717] dark:text-white outline-none placeholder-[#adb5bd]"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="text-[#868e96] hover:text-[#171717] dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {(() => {
            const normalizedQuery = searchQuery.toLowerCase().trim()

            // 1. Filter allowed items by role
            const allowedItems = menuItems.filter(item => {
              if (workflowType === 'CASHIER_ONLY' && item.name === 'Plan de Salle') return false
              if (!hasAccess(item.roles)) return false
              if (item.subItems) {
                const allowedSub = item.subItems.filter(sub => hasAccess(sub.roles))
                return allowedSub.length > 0
              }
              return true
            })

            // 2. Filter by search query
            const filteredItems = allowedItems.map(item => {
              const parentMatches = item.name.toLowerCase().includes(normalizedQuery)
              
              if (item.subItems) {
                const matchingSubItems = item.subItems.filter(sub => 
                  sub.name.toLowerCase().includes(normalizedQuery)
                )
                
                const hasMatchingSubs = matchingSubItems.length > 0
                
                if (parentMatches || hasMatchingSubs) {
                  return {
                    ...item,
                    // If parent matches but no subs match, show all subs. If subs match, show only matching subs
                    subItems: parentMatches && !hasMatchingSubs ? item.subItems : matchingSubItems
                  }
                }
                return null
              }
              
              return parentMatches ? item : null
            }).filter((item): item is NonNullable<typeof item> => item !== null)

            // 3. Render list
            if (filteredItems.length === 0) {
              return (
                <div className="px-4 py-8 text-center text-xs font-semibold text-[#868e96] dark:text-white/40">
                  Aucun menu ne correspond.
                </div>
              )
            }

            return filteredItems.map((item) => {
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

              // Active state helpers
              const isDirectActive = pathname === item.href
              const isSubActive = filteredSubItems?.some(sub => 
                pathname === sub.href || pathname.startsWith(sub.href + '/')
              )
              const isExpanded = searchQuery ? true : (expandedMenus[item.href] || false)

              return (
                <div key={item.href}>
                  <div
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-all cursor-pointer ${
                      isDirectActive
                        ? 'bg-[#FF6D00]/10 text-[#FF6D00] dark:bg-white/10 dark:text-[#FF6D00] shadow-md dark:shadow-black/10 font-bold'
                        : isSubActive
                        ? 'text-[#FF6D00]/80 dark:text-[#FF6D00]/95 font-bold bg-[#FF6D00]/5 dark:bg-white/5'
                        : 'text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#171717] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                    onClick={() => {
                      if (filteredSubItems) {
                        toggleMenuExpanded(item.href)
                      } else {
                        router.push(item.href)
                        setIsSidebarOpen(false)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4 shrink-0' })}
                      <span className="text-[11px] font-bold uppercase tracking-wider">{item.name}</span>
                    </div>
                    {filteredSubItems && (
                      <div>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    )}
                  </div>

                  {filteredSubItems && isExpanded && (
                    <div className="mt-1 ml-4 space-y-1">
                      {filteredSubItems.map((subItem) => {
                        const isSubItemActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                              isSubItemActive
                                ? 'bg-[#FF6D00]/10 text-[#FF6D00] dark:bg-white/15 dark:text-white font-bold'
                                : 'text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#171717] dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white/90'
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
            })
          })()}
        </nav>

        <div className="mt-auto space-y-2 p-4 border-t border-[#E5E7EB] dark:border-[#2e3440]">
          <Link
            href="/"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-4 rounded-2xl px-4 py-3 text-[#868e96] hover:bg-[#F8F9FA] hover:text-[#171717] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white transition-all"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest">Retour POS</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-[#e03131] hover:bg-[#fff5f5] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-[var(--parabellum-danger)] transition-all"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest">Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-20 items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-3 dark:border-[#2e3440] dark:bg-[#181a20] md:px-6 lg:px-10 shadow-sm shrink-0">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] dark:border-[#2e3440] dark:bg-[#181a20] dark:text-[#eceff4] transition-all hover:bg-[#F8F9FA] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <span className="block truncate text-[9px] font-black uppercase tracking-widest text-[#adb5bd] dark:text-[#8c96a5]">
                Espace Gestion Restaurant
              </span>
              <h2 className="mt-1 truncate text-xs font-black uppercase tracking-tight text-[#171717] dark:text-white">
                {store?.name || 'Chargement...'}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] dark:border-[#2e3440] dark:bg-[#181a20] dark:text-[#eceff4] transition-all hover:bg-[#F8F9FA]"
              title={isDarkMode ? 'Passer au Mode Clair' : 'Passer au Mode Sombre'}
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-[#868e96]" />}
            </button>
            {store?.logo ? (
              <div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-white px-2 shadow-sm dark:border-[#2e3440] dark:bg-[#181a20] sm:h-11 sm:w-16">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#2e3440] dark:bg-[#181a20]">
                <Store className="h-5 w-5 text-[#868e96] dark:text-[#8c96a5]" />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F5F6F8] dark:bg-[#0f1115] p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
