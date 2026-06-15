import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { StoreService } from "@/services/store.service"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  try {
    const stores = await StoreService.getStoresForUser(
      session.user.id,
      session.user.role,
      session.user.storeId
    )
    return NextResponse.json(stores, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé : privilèges insuffisants" }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (!body.name) {
      return NextResponse.json({ error: "Le nom de l'établissement est requis." }, { status: 400 })
    }

    const newStore = await StoreService.createStore(body)
    return NextResponse.json(newStore, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
