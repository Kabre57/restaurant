import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { StockTransferService } from "@/services/stock-transfer.service"

import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  try {
    let transfers
    if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
      transfers = await prisma.stockTransfer.findMany({
        include: {
          product: true,
          fromStore: { select: { id: true, name: true } },
          toStore: { select: { id: true, name: true } },
        },
        orderBy: { requestedAt: "desc" },
      })
    } else {
      transfers = await StockTransferService.getTransfersForStore(session.user.storeId)
    }
    return NextResponse.json(transfers, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { fromStoreId, toStoreId, productId, quantity, notes } = body

    if (!fromStoreId || !toStoreId || !productId || !quantity) {
      return NextResponse.json({ error: "Champs obligatoires manquants : fromStoreId, toStoreId, productId, quantity." }, { status: 400 })
    }

    // Security Check: A manager/employee cannot initiate transfers OUT of a store they do not have active context in
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      if (session.user.storeId !== fromStoreId && session.user.storeId !== toStoreId) {
        return NextResponse.json({ error: "Accès refusé : vous devez faire partie d'un des deux établissements concernés." }, { status: 403 })
      }
    }

    const transfer = await StockTransferService.createTransferRequest({
      fromStoreId,
      toStoreId,
      productId,
      quantity: Number(quantity),
      notes,
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
