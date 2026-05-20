'use client'

import { signIn, getSession } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Utensils, 
  ChefHat, 
  LayoutDashboard, 
  ShieldCheck, 
  UtensilsCrossed,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react"

const ROLES = [
  {
    key: 'CASHIER',
    label: 'Caissier',
    icon: UtensilsCrossed,
    description: 'Encaissement & commandes directes',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
    bgLight: 'bg-orange-50',
    redirect: '/'
  },
  {
    key: 'SERVER',
    label: 'Serveur',
    icon: Utensils,
    description: 'Service en salle & suivi des tables',
    color: 'bg-emerald-600',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-600',
    bgLight: 'bg-emerald-50',
    redirect: '/serveur'
  },
  {
    key: 'KITCHEN',
    label: 'Cuisine (KDS)',
    icon: ChefHat,
    description: 'Affichage et gestion des commandes',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
    bgLight: 'bg-red-50',
    redirect: '/kds'
  },
  {
    key: 'RESTAURATEUR',
    label: 'Manager / Restaurateur',
    icon: LayoutDashboard,
    description: 'Tableau de bord & gestion',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-600',
    bgLight: 'bg-blue-50',
    redirect: '/restaurateur/produits'
  },
  {
    key: 'ADMIN',
    label: 'Franchiseur',
    icon: ShieldCheck,
    description: 'Multi-sites, commissions & validations',
    color: 'bg-purple-600',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-600',
    bgLight: 'bg-purple-50',
    redirect: '/admin/dashboard'
  },
]

function getRoleRedirect(role: string): string {
  const found = ROLES.find(r => r.key === role)
  return found?.redirect || '/'
}

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password
      })

      if (res?.error) {
        setError("Email ou mot de passe incorrect")
      } else {
        // Fetch session to get the real role from DB
        const session = await getSession()
        const role = session?.user?.role || selectedRole || 'CASHIER'
        const redirect = getRoleRedirect(role)
        router.push(redirect)
        router.refresh()
      }
    } catch {
      setError("Une erreur est survenue, veuillez réessayer")
    } finally {
      setIsLoading(false)
    }
  }

  const activeRole = ROLES.find(r => r.key === selectedRole)

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f4f6] font-sans lg:flex-row lg:items-center lg:justify-center lg:p-10">
      
      {/* Left Panel - Branding */}
      <div className="relative hidden overflow-hidden rounded-l-xl bg-white lg:flex lg:min-h-[42rem] lg:w-[34rem] lg:flex-col lg:items-center lg:justify-center lg:p-16">
        <div className="relative z-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-[var(--parabellum-primary)] shadow-xl shadow-blue-500/20">
            <Utensils className="h-10 w-10 text-white" />
          </div>
          
          <div className="mt-6">
            <h1 className="mb-3 text-5xl font-black tracking-tight text-[#2d3652]">
              ParabellumPOS
            </h1>
            <p className="text-lg font-medium text-[#72788f]">Système de caisse restaurant multi-espaces</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-6 shadow-2xl sm:px-6 sm:py-8 lg:min-h-[42rem] lg:max-w-[42rem] lg:rounded-r-xl lg:p-12">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--parabellum-primary)] shadow-lg shadow-blue-500/20">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black text-[#2d3652]">ParabellumPOS</h2>
            <p className="mt-2 text-sm font-medium text-[#72788f]">Système de caisse restaurant multi-espaces</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-[#8a92a6] uppercase tracking-widest ml-1">Votre rôle</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLES.map(role => {
                const Icon = role.icon
                const isActive = selectedRole === role.key
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`group rounded-2xl border-2 p-4 text-left transition-all ${
                      isActive
                        ? `${role.bgLight} ${role.borderColor}`
                        : 'bg-white border-[#e5e7ef] hover:bg-[#fafbff] hover:border-[#cfd6ea]'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <div className={`mb-0 flex h-10 w-10 items-center justify-center rounded-xl ${role.color} shadow-lg sm:mb-2`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold leading-tight sm:text-xs ${isActive ? role.textColor : 'text-[#2d3652]'}`}>{role.label}</p>
                        <p className={`mt-1 text-xs leading-tight sm:hidden ${isActive ? 'text-[#72788f]' : 'text-[#8a92a6]'}`}>{role.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Login Form */}
          <div className={`rounded-xl border bg-white p-5 shadow-[0_0.75rem_1.875rem_rgba(47,76,221,0.08)] transition-all sm:p-8 ${activeRole ? 'border-[#cfd6ea]' : 'border-[#e5e7ef]'}`}>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#8a92a6] uppercase tracking-widest ml-1">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#dfe3eb] bg-white px-4 py-3.5 text-sm font-medium text-[#2d3652] transition-all placeholder:text-[#adb5bd] focus:border-[var(--parabellum-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  placeholder="votre@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#8a92a6] uppercase tracking-widest ml-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#dfe3eb] bg-white px-4 py-3.5 pr-12 text-sm font-medium text-[#2d3652] transition-all placeholder:text-[#adb5bd] focus:border-[var(--parabellum-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8a92a6] transition-colors hover:text-[#2d3652]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg mt-2 ${
                  activeRole
                    ? `${activeRole.color} text-white hover:opacity-90 shadow-orange-500/20`
                    : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {activeRole && <activeRole.icon className="w-5 h-5" />}
                    {selectedRole ? `Connexion ${activeRole?.label || ''}` : 'Se connecter'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
