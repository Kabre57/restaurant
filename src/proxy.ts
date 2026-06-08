import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Rôles valides — DOIT correspondre exactement à l'enum `Role` de schema.prisma.
 */
const ROLE = {
  ADMIN:        "ADMIN",
  RESTAURATEUR: "RESTAURATEUR",
  CASHIER:      "CASHIER",
  SERVER:       "SERVER",
  KITCHEN:      "KITCHEN",
  DELIVERY:     "DELIVERY",
} as const;
type AppRole = typeof ROLE[keyof typeof ROLE];

function hasRole(role: string, allowed: AppRole[]): boolean {
  return (allowed as string[]).includes(role);
}

// ─── CORS Configuration ──────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.ALLOWED_API_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "null",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
    "Access-Control-Max-Age": "86400",
  };
}

// ─── NextAuth Middleware for Pages ───────────────────────────────────────────

const authProxy = withAuth(
  async function proxy(req: NextRequest & { nextauth?: { token: unknown } }) {
    const token = (req as { nextauth?: { token: Record<string, unknown> | null } }).nextauth?.token;
    const path = req.nextUrl.pathname;
    const role = (token?.role ?? "") as string;

    // ── /admin : ADMIN uniquement ────────────────────────────
    if (path.startsWith("/admin")) {
      if (!hasRole(role, [ROLE.ADMIN])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /kds : cuisine + managers ────────────────────────────
    if (path.startsWith("/kds")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.KITCHEN])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /restaurateur : tous les rôles opérationnels ─────────
    if (path.startsWith("/restaurateur")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.CASHIER, ROLE.SERVER, ROLE.KITCHEN])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /serveur : serveurs + managers ───────────────────────
    if (path.startsWith("/serveur")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.SERVER])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /cashier : caissiers + managers ──────────────────────
    if (path.startsWith("/cashier")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.CASHIER, ROLE.DELIVERY])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── / (cashier main POS page) ── role redirects ───────────────────────
    if (path === "/" && role !== "CASHIER" && role !== "RESTAURATEUR") {
      if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      if (role === "SERVER") return NextResponse.redirect(new URL("/serveur", req.url));
      if (role === "KITCHEN") return NextResponse.redirect(new URL("/kds", req.url));
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// ─── Main Unified Proxy ──────────────────────────────────────────────────────

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // 0. Bypass NextAuth internal routes to preserve cookie handling
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 1. Pre-flight OPTIONS on /api/*
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  // 2. API Publique v1 (/api/v1/*) — Syntactic check for API Token (Prisma check is in route handlers)
  if (pathname.startsWith("/api/v1/")) {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKeyHeader = req.headers.get("x-api-key") ?? "";
    let token = authHeader.replace("Bearer ", "").trim();
    if (!token && apiKeyHeader) {
      token = apiKeyHeader.trim();
    }

    if (!token || !token.startsWith("GLP_")) {
      return NextResponse.json(
        { error: "Clé API invalide ou manquante", success: false },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const res = NextResponse.next();
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  // 3. API Globales (/api/*) — Protection par Session NextAuth
  if (pathname.startsWith("/api/")) {
    // Exceptions pour les routes publiques / webhooks
    const isPublicApi =
      pathname.startsWith("/api/auth/") ||
      pathname.startsWith("/api/glovo-webhook") ||
      pathname.startsWith("/api/payments/mobile") ||
      pathname.startsWith("/api/remote-order") ||
      pathname.startsWith("/api/health");

    if (!isPublicApi) {
      const jwtToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!jwtToken) {
        return NextResponse.json(
          { error: "Authentification requise", success: false },
          { status: 401, headers: corsHeaders(origin) }
        );
      }

      // Protection spécifique API Hardware (/api/hardware/*)
      if (pathname.startsWith("/api/hardware/")) {
        const role = jwtToken.role as string | undefined;
        if (!role || !["ADMIN", "CASHIER", "RESTAURATEUR"].includes(role)) {
          return NextResponse.json(
            { error: "Rôle insuffisant pour accéder aux périphériques", success: false },
            { status: 403, headers: corsHeaders(origin) }
          );
        }
      }

      // Protection spécifique API Debug (/api/debug/*)
      if (pathname.startsWith("/api/debug/")) {
        const role = jwtToken.role as string | undefined;
        if (role !== "ADMIN") {
          return NextResponse.json(
            { error: "Accès refusé", success: false },
            { status: 403, headers: corsHeaders(origin) }
          );
        }
      }
    }

    // CORS sur toutes les requêtes API autorisées
    const res = NextResponse.next();
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  // 4. Pages Standard (Non-API) — Protection NextAuth standard
  return authProxy(req as NextRequestWithAuth, event);
}

// ─── Matcher Configuration ───────────────────────────────────────────────────

export const config = {
  matcher: [
    "/admin/:path*",
    "/restaurateur/:path*",
    "/serveur/:path*",
    "/kds/:path*",
    "/cashier/:path*",
    "/",
    "/api/:path*",
  ],
};
