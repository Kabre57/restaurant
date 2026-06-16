import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from '@/lib/db'
import KDSClient, { KDSOrder } from "@/components/kds/KDSClient"

export const dynamic = "force-dynamic"

type KdsSessionUser = {
  storeId?: string | null
}

export default async function KDSPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/login")
  }
  
  const user = session.user as KdsSessionUser
  const storeId = user.storeId || "store-main"
  
  // Récupérer les commandes actives pour la cuisine
  const dbOrders = await prisma.order.findMany({
    where: {
      storeId,
      status: {
        in: ["EN_ATTENTE", "PREPARATION", "PRET"]
      }
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      },
      table: true
    },
    orderBy: {
      createdAt: "desc"
    }
  })
  
  // Formater les commandes pour correspondre au type attendu par KDSClient
  const initialOrders: KDSOrder[] = dbOrders.map(o => ({
    id: o.id,
    status: o.status,
    storeId: o.storeId,
    type: o.type,
    createdAt: o.createdAt,
    estimatedPrepMinutes: o.estimatedPrepMinutes,
    estimatedReadyAt: o.estimatedReadyAt ? o.estimatedReadyAt.toISOString() : null,
    actualPrepMinutes: o.actualPrepMinutes,
    preparationStartedAt: o.preparationStartedAt ? o.preparationStartedAt.toISOString() : null,
    readyAt: o.readyAt ? o.readyAt.toISOString() : null,
    servedAt: o.servedAt ? o.servedAt.toISOString() : null,
    customerNotes: o.customerNotes,
    items: o.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      options: item.options,
      product: {
        name: item.product.name,
        category: {
          name: item.product.category?.name || "Autre"
        }
      }
    })),
    table: o.table ? { number: o.table.number } : null
  }))

  const store = await prisma.store.findUnique({
    where: { id: storeId }
  })
  const storeName = store?.name || "Gourmet POS — Restaurant Principal"

  return (
    <KDSClient
      initialOrders={initialOrders}
      storeId={storeId}
      storeName={storeName}
    />
  )
}
