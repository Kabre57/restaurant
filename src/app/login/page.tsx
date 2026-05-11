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
    label: 'Serveur / Caissier',
    icon: UtensilsCrossed,
    description: 'Prise de commande & encaissement',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
    bgLight: 'bg-orange-50',
    redirect: '/'
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
    label: 'Administrateur',
    icon: ShieldCheck,
    description: 'Supervision globale de la plateforme',
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
    <div className="min-h-screen bg-slate-900 flex font-sans">
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center space-y-8">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/30 mx-auto">
            <Utensils className="w-12 h-12 text-white" />
          </div>
          
          <div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-3">
              POS<span className="text-orange-500">Restaurant</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium">Système de Caisse Intelligent</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {ROLES.map(role => {
              const Icon = role.icon
              return (
                <div key={role.key} className="bg-white/5 rounded-2xl p-4 border border-white/10 text-left space-y-2">
                  <div className={`w-8 h-8 ${role.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-white text-xs font-bold leading-tight">{role.label}</p>
                  <p className="text-slate-500 text-[10px] leading-tight">{role.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="text-center">
            <div className="lg:hidden w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white">Connexion</h2>
            <p className="text-slate-400 mt-2 text-sm">Sélectionnez votre profil puis identifiez-vous</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Votre rôle</p>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(role => {
                const Icon = role.icon
                const isActive = selectedRole === role.key
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all group ${
                      isActive
                        ? `${role.bgLight} ${role.borderColor}`
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-8 h-8 ${role.color} rounded-xl flex items-center justify-center mb-2 shadow-lg`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className={`text-xs font-bold leading-tight ${isActive ? role.textColor : 'text-white'}`}>{role.label}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Login Form */}
          <div className={`bg-white/5 rounded-3xl p-8 border transition-all ${activeRole ? `border-white/20` : 'border-white/10'}`}>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/80 text-white border border-slate-700 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-600"
                  placeholder="votre@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800/80 text-white border border-slate-700 rounded-xl px-4 py-3.5 pr-12 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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
