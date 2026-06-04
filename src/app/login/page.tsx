"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Loader2, Utensils } from "lucide-react";

const ROLE_CONFIG = {
  ADMIN:        { redirect: "/admin/dashboard" },
  RESTAURATEUR: { redirect: "/restaurateur/stats" },
  CASHIER:      { redirect: "/cashier" },
  KITCHEN:      { redirect: "/kds" },
  SERVER:       { redirect: "/serveur" },
} as const;

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result?.ok || result.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    // Redirection
    if (callbackUrl) {
      router.push(callbackUrl);
    } else {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      const role = data?.user?.role as keyof typeof ROLE_CONFIG;
      const target = ROLE_CONFIG[role]?.redirect ?? "/restaurateur/stats";
      router.push(target);
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* Colonne de Gauche : Grande image d'ambiance (uniquement sur md+) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[50%] xl:w-[40%] relative">
        <img
          src="/restaurant-interior.jpg"
          alt="Restaurant Interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay sombre élégant pour la lisibilité */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Texte en bas à gauche */}
        <div className="absolute bottom-16 left-12 pr-12 text-white z-10">
          <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight">
            Gérez votre restaurant<br />en toute simplicité.
          </h2>
        </div>
      </div>

      {/* Colonne de Droite : Formulaire de connexion sur fond blanc */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-[420px] flex flex-col justify-center">
          
          {/* Logo orange couverts croisés */}
          <div className="w-12 h-12 bg-[#FF6D00] rounded-[16px] flex items-center justify-center mb-6 shadow-md shadow-[#FF6D00]/10">
            <Utensils className="text-white" size={24} />
          </div>

          {/* Titre & Sous-titre */}
          <h1 className="text-3xl font-extrabold text-[#171717] tracking-tight mb-2">
            Bienvenue
          </h1>
          <p className="text-[#6B7280] font-medium text-sm mb-8">
            Connectez-vous à votre espace.
          </p>

          {/* Alert Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold px-4 py-3.5 rounded-[12px] mb-6 text-center">
              {error}
            </div>
          )}

          {/* Formulaire de Connexion */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Adresse Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#171717] ml-1 block">
                Adresse Email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="resto@gourmet.ci"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#EFF3F8] rounded-[14px] outline-none text-sm font-medium text-[#171717] border border-[#EFF3F8] focus:border-[#FF6D00] focus:ring-2 focus:ring-[#FF6D00]/10 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#171717] ml-1 block">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-12 py-3.5 bg-[#EFF3F8] rounded-[14px] outline-none text-sm font-medium text-[#171717] border border-[#EFF3F8] focus:border-[#FF6D00] focus:ring-2 focus:ring-[#FF6D00]/10 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#171717] transition-colors"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Se souvenir de moi & Mot de passe oublié */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 font-bold text-[#6B7280] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#EFF3F8] text-[#FF6D00] focus:ring-[#FF6D00]/20 w-4 h-4 cursor-pointer"
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                className="font-bold text-[#FF6D00] hover:text-[#E66200] transition-colors"
                onClick={() => alert("Veuillez contacter votre administrateur pour réinitialiser votre mot de passe.")}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Bouton de Soumission Orange */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#FF6D00] hover:bg-[#E66200] disabled:opacity-60 text-white font-extrabold rounded-[18px] shadow-lg shadow-[#FF6D00]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Lien d'inscription */}
          <p className="text-center text-xs font-bold text-[#6B7280] pt-6">
            Vous n'avez pas de compte ?{" "}
            <a
              href="/register"
              className="text-[#FF6D00] hover:text-[#E66200] hover:underline transition-colors"
            >
              Créez gratuitement votre compte
            </a>
          </p>

        </div>
      </div>
      
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="animate-spin text-[#FF6D00]" size={36} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
