import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { StoreService } from "@/services/store.service"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "RESTAURATEUR" &&
    session.user.role !== "MANAGER"
  ) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  try {
    const summary = await StoreService.getStoreHubSummary()
    return NextResponse.json(summary, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
