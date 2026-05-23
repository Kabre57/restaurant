import { withAuth } from "next-auth/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

/**
 * Middleware unifié — POS Restaurant
 *
 * Ce fichier est l'unique point d'entrée du middleware Next.js.
 * Il gère :
 *  1. Protection des routes de pages (via withAuth) → /admin, /restaurateur, /kds, /serveur
 *  2. Protection de l'API publique /api/v1/* → X-Api-Key requis
 *  3. Protection de l'API hardware /api/hardware/* → rôle autorisé requis
 *  4. Headers CORS sur toutes les routes /api
 */

// ─── Helpers CORS ────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.ALLOWED_API_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*"))
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "null",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
    "Access-Control-Max-Age": "86400",
  }
}

// ─── Middleware principal ────────────────────────────────────────────────────

export default withAuth(
  async function middleware(req: NextRequest & { nextauth?: { token: unknown } }) {
    const token = (req as { nextauth?: { token: Record<string, unknown> | null } }).nextauth?.token
    const path = req.nextUrl.pathname
    const origin = req.headers.get("origin")

    // ── Pre-flight OPTIONS ────────────────────────────────────────────────────
    if (req.method === "OPTIONS" && path.startsWith("/api/")) {
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
    }

    // ── Protection /api/v1/* — X-Api-Key obligatoire ─────────────────────────
    if (path.startsWith("/api/v1/")) {
      const apiKey = req.headers.get("x-api-key")
      const validApiKey = process.env.PUBLIC_API_KEY

      if (!validApiKey) {
        return NextResponse.json(
          { error: "API publique non configurée", success: false },
          { status: 503, headers: corsHeaders(origin) }
        )
      }

      if (!apiKey || apiKey !== validApiKey) {
        return NextResponse.json(
          { error: "Clé API invalide ou manquante", success: false },
          { status: 401, headers: corsHeaders(origin) }
        )
      }

      const res = NextResponse.next()
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // ── Protection /api/hardware/* — session + rôle requis ───────────────────
    if (path.startsWith("/api/hardware/")) {
      const jwtToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

      if (!jwtToken) {
        return NextResponse.json(
          { error: "Authentification requise", success: false },
          { status: 401 }
        )
      }

      const role = jwtToken.role as string | undefined
      if (!role || !["ADMIN", "CASHIER", "RESTAURATEUR"].includes(role)) {
        return NextResponse.json(
          { error: "Rôle insuffisant pour accéder aux périphériques", success: false },
          { status: 403 }
        )
      }
    }

    // ── CORS sur toutes les routes /api ───────────────────────────────────────
    if (path.startsWith("/api/")) {
      const res = NextResponse.next()
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // ── Protection de l'espace Super Admin Plateforme ─────────────────────────
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ── Protection de l'espace Restaurateur ──────────────────────────────────
    if (path.startsWith("/restaurateur") && token?.role !== "RESTAURATEUR") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // ── Protection de l'espace Serveur ───────────────────────────────────────
    if (path.startsWith("/serveur") && token?.role !== "SERVER" && token?.role !== "RESTAURATEUR") {
      if (token?.role === "CASHIER") return NextResponse.redirect(new URL("/", req.url))
      if (token?.role === "KITCHEN") return NextResponse.redirect(new URL("/kds", req.url))
      if (token?.role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url))
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ── Protection de l'espace Caisse ────────────────────────────────────────
    if (path === "/" && token?.role !== "CASHIER" && token?.role !== "RESTAURATEUR") {
      if (token?.role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url))
      if (token?.role === "SERVER") return NextResponse.redirect(new URL("/serveur", req.url))
      if (token?.role === "KITCHEN") return NextResponse.redirect(new URL("/kds", req.url))
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ── Protection de la Cuisine (KDS) ────────────────────────────────────────
    if (path.startsWith("/kds") && token?.role !== "KITCHEN" && token?.role !== "RESTAURATEUR") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        // Les routes API et les webhooks ne passent pas par withAuth
        if (path.startsWith("/api/")) return true
        // Les pages publiques (menu self-service, login) sont accessibles sans token
        if (path.startsWith("/menu/") || path.startsWith("/order/") || path === "/login") return true
        return !!token
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    // Pages protégées
    "/admin/:path*",
    "/restaurateur/:path*",
    "/serveur/:path*",
    "/kds/:path*",
    "/",
    // Routes API (CORS + auth API key + hardware)
    "/api/v1/:path*",
    "/api/hardware/:path*",
    "/api/:path*",
  ],
}

