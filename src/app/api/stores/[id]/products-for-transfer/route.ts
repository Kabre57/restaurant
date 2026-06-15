import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  const { id } = await params
  const storeId = id

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    const isLinked = session.user.storeId === storeId || await prisma.user.count({
      where: {
        id: session.user.id,
        stores: { some: { id: storeId } }
      }
    }) > 0

    if (!isLinked) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 })
    }
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        storeId,
        barcode: {
          not: "",
        },
        NOT: {
          barcode: null,
        },
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        stockQuantity: true,
        price: true,
        trackStock: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(products, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
