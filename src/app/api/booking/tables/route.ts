import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId") || session.user.storeId;
  if (!storeId) {
    return NextResponse.json({ error: "storeId est requis" }, { status: 400 });
  }

  // Isolation multi-tenant
  const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, storeId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
  }

  try {
    const tables = await BookingService.getTables(storeId);
    return NextResponse.json(tables);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur interne du serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

