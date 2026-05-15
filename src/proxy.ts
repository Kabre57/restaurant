import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    
    // Protection de l'espace Super Admin Plateforme
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Protection de l'espace Restaurateur (Gestionnaire de restaurant)
    if (path.startsWith("/restaurateur") && token?.role !== "RESTAURATEUR") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // Protection de l'espace Serveur - Accessible aussi au restaurateur
    if (path.startsWith("/serveur") && token?.role !== "SERVER" && token?.role !== "RESTAURATEUR") {
      if (token?.role === "CASHIER") return NextResponse.redirect(new URL("/", req.url))
      if (token?.role === "KITCHEN") return NextResponse.redirect(new URL("/kds", req.url))
      if (token?.role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url))
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Protection de l'espace Caisse (Caissier) - Accessible par Restaurateur aussi
    if (path === "/" && (token?.role !== "CASHIER" && token?.role !== "RESTAURATEUR")) {
      // Si c'est un admin, redirection vers son dashboard
      if (token?.role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url))
      if (token?.role === "SERVER") return NextResponse.redirect(new URL("/serveur", req.url))
      if (token?.role === "KITCHEN") return NextResponse.redirect(new URL("/kds", req.url))
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Protection de la Cuisine (KDS)
    if (path.startsWith("/kds") && (token?.role !== "KITCHEN" && token?.role !== "RESTAURATEUR")) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/restaurateur/:path*",
    "/serveur/:path*",
    "/kds/:path*",
    "/"
  ],
}
