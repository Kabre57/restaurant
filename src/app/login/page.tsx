"use client";

import { Suspense, useState, type FormEvent } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

const ROLE_CONFIG = {
  ADMIN: { redirect: "/admin/dashboard" },
  RESTAURATEUR: { redirect: "/restaurateur/stats" },
  CASHIER: { redirect: "/cashier" },
  KITCHEN: { redirect: "/kds" },
  SERVER: { redirect: "/serveur" },
} as const;

type SessionResponse = {
  user?: {
    role?: keyof typeof ROLE_CONFIG;
  };
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
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

    if (callbackUrl) {
      router.push(callbackUrl);
    } else {
      const res = await fetch("/api/auth/session");
      const data: SessionResponse = await res.json();
      const role = data.user?.role;
      const target = role ? ROLE_CONFIG[role]?.redirect ?? "/restaurateur/stats" : "/restaurateur/stats";
      router.push(target);
    }

    if (rememberMe) {
      localStorage.setItem("parabellum_login_email", email);
    } else {
      localStorage.removeItem("parabellum_login_email");
    }

    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden lg:flex">
        <Image
          src="/restaurant-interior.jpg"
          alt="Intérieur du restaurant"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(18,18,18,0.86),rgba(18,18,18,0.58),rgba(18,18,18,0.28))]" />

        <div className="relative z-10 flex min-h-screen flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1rem] border border-white/10 bg-black/90 p-1 shadow-[0_14px_28px_rgba(0,0,0,0.22)]">
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
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/70">
                Progi-teck POS
              </p>
              <p className="text-sm text-white/65">Gestion restaurant & commerce</p>
            </div>
          </div>

          <div className="max-w-xl space-y-6 text-white">
            <span className="th-badge w-fit border-white/15 bg-white/10 text-white">
              <ShieldCheck className="h-4 w-4" />
              Espace sécurisé
            </span>
            <h1 className="max-w-lg text-5xl font-extrabold uppercase leading-[0.88] tracking-tight xl:text-6xl" style={{ fontFamily: 'var(--title-font)' }}>
              Pilotez votre restaurant avec une interface claire.
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/80">
              Commandes, caisse, cuisine et e-commerce s’alignent dans une expérience unique,
              pensée pour les équipes qui travaillent vite et sans friction.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Commandes", value: "Temps réel" },
              { label: "Caisse", value: "Flux unifié" },
              { label: "E-commerce", value: "Source serveur" },
            ].map((item) => (
              <div key={item.label} className="rounded-[1rem] border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/65">
                  {item.label}
                </p>
                <p className="mt-2 text-base font-semibold uppercase tracking-wide">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.jpg"
              alt="Progiteck"
              width={56}
              height={56}
              priority
              className="h-14 w-14 rounded-[1rem] border border-[var(--parabellum-border)] bg-black/90 p-1 object-contain"
            />
            <div>
              <p className="barab-kicker">Connexion</p>
              <h2 className="mt-1 text-3xl font-bold uppercase leading-none tracking-tight text-[var(--parabellum-text)]">
                Bienvenue
              </h2>
            </div>
          </div>

          <div className="barab-card rounded-[1.5rem] p-6 sm:p-7">
            {error && (
              <div className="mb-5 rounded-[1rem] border border-[rgba(235,20,0,0.2)] bg-[rgba(235,20,0,0.08)] px-4 py-3 text-sm text-[var(--parabellum-danger)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--parabellum-text)]">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--parabellum-muted)]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="resto@gourmet.ci"
                    required
                    className="th-input h-12 pl-10 pr-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--parabellum-text)]">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--parabellum-muted)]" />
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="th-input h-12 pl-10 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--parabellum-muted)] transition-colors hover:text-[var(--parabellum-text)]"
                    aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 font-medium text-[var(--parabellum-muted)]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--parabellum-border)] text-[var(--parabellum-primary)] focus:ring-[var(--parabellum-primary)]"
                  />
                  Se souvenir de moi
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--parabellum-primary)] transition-colors hover:text-[var(--parabellum-text)]"
                  onClick={() => alert("Veuillez contacter votre administrateur pour réinitialiser votre mot de passe.")}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <button type="submit" disabled={loading} className="th-btn w-full justify-center">
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[var(--parabellum-muted)]">
            Vous n'avez pas de compte ?{" "}
            <a
              href="/register"
              className="font-semibold text-[var(--parabellum-primary)] transition-colors hover:text-[var(--parabellum-text)]"
            >
              Créez gratuitement votre compte
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--parabellum-primary)]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
