// src/app/api/auth/session/route.ts — Session courante via NextAuth
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({});
  }

  return NextResponse.json(session);
}
