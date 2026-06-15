import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { StockTransferService } from "@/services/stock-transfer.service"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!status || !['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
    return NextResponse.json({ error: "Statut invalide. Les statuts autorisés sont : APPROVED, REJECTED, COMPLETED." }, { status: 400 })
  }

  try {
    // 1. Récupérer le transfert pour valider les droits d'accès
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromStore: true,
        toStore: true,
      }
    })

    if (!transfer) {
      return NextResponse.json({ error: "Demande de transfert introuvable." }, { status: 404 })
    }

    // 2. Vérification des droits d'accès
    const role = session.user.role
    const userStoreId = session.user.storeId

    if (role === "STORE_EMPLOYEE") {
      return NextResponse.json({ error: "Accès refusé : les employés ne peuvent pas valider les transferts." }, { status: 403 })
    }

    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "STORE_MANAGER") {
      return NextResponse.json({ error: "Accès refusé : privilèges insuffisants." }, { status: 403 })
    }

    // Si STORE_MANAGER, vérifier s'il gère l'un des deux stores concernés
    if (role === "STORE_MANAGER") {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          storeId: true,
          stores: { select: { id: true } },
        }
      })

      const managedStoreIds = [
        dbUser?.storeId,
        ...(dbUser?.stores.map(s => s.id) || [])
      ]

      const isAuthorized = managedStoreIds.includes(transfer.fromStoreId) || managedStoreIds.includes(transfer.toStoreId)
      if (!isAuthorized) {
        return NextResponse.json({ error: "Accès refusé : vous ne gérez pas les établissements impliqués dans ce transfert." }, { status: 403 })
      }
    }

    // 3. Procéder à la mise à jour
    const updatedTransfer = await StockTransferService.updateTransferStatus(
      id,
      status,
      session.user.id
    )

    return NextResponse.json(updatedTransfer, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
