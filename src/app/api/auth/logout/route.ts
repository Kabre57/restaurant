// src/app/api/auth/logout/route.ts — Déconnexion NextAuth
// Supprime le cookie de session NextAuth directement (AUTH_COOKIE n'existe pas dans next-auth v4).

import { NextResponse } from "next/server";

// Les deux noms de cookie utilisés par NextAuth selon l'environnement
const NEXTAUTH_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token", // HTTPS
];

export async function POST() {
  const res = NextResponse.json({ success: true });
  // Expirer tous les cookies de session NextAuth possibles
  for (const cookieName of NEXTAUTH_COOKIES) {
    res.cookies.set(cookieName, "", {
      maxAge:   0,
      path:     "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return res;
}

