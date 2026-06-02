// src/app/api/auth/session/route.ts — Session courante via NextAuth

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(null, { status: 200 });
  }

  return NextResponse.json({
    ...session,
    user: {
      id:      (session.user as any).id,
      email:   session.user.email,
      name:    session.user.name,
      role:    (session.user as any).role,
      storeId: (session.user as any).storeId,
    },
  }, { status: 200 });
}

