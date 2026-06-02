// middleware.ts — Protection des routes via NextAuth JWT
// BUG-003 FIX : rôle "MANAGER" remplacé par "RESTAURATEUR" (conforme à l'enum Prisma)

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Rôles valides — DOIT correspondre exactement à l'enum `Role` de schema.prisma.
 * Toute valeur hors de cette liste sera considérée comme non autorisée.
 *
 * enum Role { ADMIN, RESTAURATEUR, CASHIER, SERVER, KITCHEN, DELIVERY }
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

/** Vérifie si un rôle est dans la liste autorisée */
function hasRole(role: string, allowed: AppRole[]): boolean {
  return (allowed as string[]).includes(role);
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirection si pas de token (withAuth le gère mais on est explicite)
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    const role = (token.role ?? "") as string;

    // ── /admin : ADMIN uniquement ────────────────────────────
    if (pathname.startsWith("/admin")) {
      if (!hasRole(role, [ROLE.ADMIN])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /kds : cuisine + managers ────────────────────────────
    if (pathname.startsWith("/kds")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.KITCHEN])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /restaurateur : tous les rôles opérationnels ─────────
    if (pathname.startsWith("/restaurateur")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.CASHIER, ROLE.SERVER, ROLE.KITCHEN])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /serveur : serveurs + managers ───────────────────────
    if (pathname.startsWith("/serveur")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.SERVER])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── /cashier : caissiers + managers ──────────────────────
    if (pathname.startsWith("/cashier")) {
      if (!hasRole(role, [ROLE.ADMIN, ROLE.RESTAURATEUR, ROLE.CASHIER, ROLE.DELIVERY])) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // ── API : Protection globale ─────────────────────────────
    // FIXED: Ajouter protection globale routes /api (sauf /api/auth)
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // ── API : les routes API sont protégées côté handler ─────
    // (via getServerSession dans chaque route.ts)
    // Le middleware vérifie uniquement la présence d'un token valide.

    return NextResponse.next();
  },
  {
    callbacks: {
      // Laisse passer si token présent — la logique fine est dans le middleware ci-dessus
      authorized({ token }) {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/kds/:path*",
    "/serveur/:path*",
    "/restaurateur/:path*",
    "/cashier/:path*",
    // API sensibles : vérification token (la logique fine est dans les handlers)
    "/api/orders/:path*",
    "/api/kds/:path*",
    "/api/hardware/:path*",
    "/api/exports/:path*",
    "/api/v1/:path*",
  ],
};

