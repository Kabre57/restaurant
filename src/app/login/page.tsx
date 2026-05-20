'use client'

import { signIn, getSession } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  UtensilsCrossed, Lock, Mail, Loader2, Eye, EyeOff
} from "lucide-react"

// Redirection par défaut après connexion
const DEFAULT_REDIRECT = '/'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [showPw, setShowPw]             = useState(false)
  const [error, setError]               = useState("")
  const [loading, setLoading]           = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
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
        const session = await getSession()
        const role = session?.user?.role
        
        // Redirection basée sur le rôle retourné par le backend
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          router.push('/admin/dashboard')
        } else if (role === 'RESTAURATEUR') {
          router.push('/restaurateur/stats')
        } else if (role === 'KITCHEN') {
          router.push('/kds')
        } else if (role === 'SERVER') {
          router.push('/serveur')
        } else {
          router.push(DEFAULT_REDIRECT)
        }
        
        router.refresh()
      }
    } catch {
      setError("Une erreur est survenue, veuillez réessayer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F8F9FA] text-[#171717] font-sans">

      {/* Left Side — Restaurant Photo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#171717] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('/restaurant-interior.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-16">
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Gérez votre restaurant<br/>en toute simplicité.
          </h2>
        </div>
      </div>

      {/* Right Side — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-16 bg-white">
        <div className="w-full max-w-[440px]">

          <div className="mb-10">
            <div className="w-14 h-14 bg-[#FF6D00] rounded-[16px] flex items-center justify-center mb-6 shadow-lg shadow-[#FF6D00]/20">
              <UtensilsCrossed className="text-white" size={26}/>
            </div>
            <h1 className="text-4xl font-extrabold text-[#171717] tracking-tight mb-2">Bienvenue</h1>
            <p className="text-[#6B7280] font-medium text-lg">Connectez-vous à votre espace.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#FEF2F2] border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 rounded-2xl text-sm font-medium text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#171717] ml-1">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20}/>
                <input
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border-none rounded-[16px] text-[#171717] font-medium focus:ring-2 focus:ring-[#FF6D00] outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#171717] ml-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20}/>
                <input
                  type={showPw ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full pl-12 pr-12 py-4 bg-[#F8F9FA] border-none rounded-[16px] text-[#171717] font-medium focus:ring-2 focus:ring-[#FF6D00] outline-none transition-all"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#171717]"
                >
                  {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm py-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="w-5 h-5 rounded-[6px] border-2 border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#FF6D00]"/>
                </div>
                <span className="font-bold text-[#6B7280]">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-[#FF6D00] hover:text-[#E66200] font-extrabold">Mot de passe oublié ?</a>
            </div>

            <button
              type="submit" 
              disabled={loading}
              className="w-full bg-[#FF6D00] hover:bg-[#E66200] text-white font-extrabold text-lg py-4 rounded-[16px] shadow-lg shadow-[#FF6D00]/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-2"
            >
              {loading ? <Loader2 size={22} className="animate-spin"/> : "Se connecter"}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}