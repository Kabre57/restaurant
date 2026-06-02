// src/app/api/auth/login/route.ts
// Route dépréciée — la page /login utilise NextAuth signIn() directement.
// Conservée pour éviter les 404 sur d'éventuels appels legacy.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Utilisez la page /login avec NextAuth signIn()" },
    { status: 410 }
  );
}
