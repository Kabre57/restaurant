import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ConsolidatedService } from "@/services/consolidated.service"
import { prisma } from "@/lib/db"
import { startOfDay, endOfDay, subDays } from "date-fns"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }

  const role = session.user.role
  if (role === "STORE_EMPLOYEE") {
    return NextResponse.json({ error: "Accès refusé : privilèges insuffisants" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")
  const requestedStoreId = searchParams.get("storeId") || "all"

  // 1. Déterminer les dates par défaut (7 derniers jours)
  const defaultStart = subDays(new Date(), 7)
  const defaultEnd = new Date()

  const startDate = startDateParam ? new Date(startDateParam) : defaultStart
  const endDate = endDateParam ? new Date(endDateParam) : defaultEnd

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Dates invalides." }, { status: 400 })
  }

  try {
    let targetStoreId: string | "all" = requestedStoreId

    // 2. Si le rôle est STORE_MANAGER, valider ou restreindre les accès aux stores assignés
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
      ].filter(Boolean) as string[]

      if (requestedStoreId === "all") {
        // Le manager ne peut pas interroger TOUS les stores. On va devoir filtrer
        // Pour des raisons de simplicité, on passera la première boutique ou on retournera une erreur
        // Mais nous pouvons aussi adapter le dashboard consolidé pour filtrer par rapport à son périmètre
        // Récupérons les données globales puis filtrons les résultats dans le service, 
        // ou interrogeons magasin par magasin. 
        // Faisons mieux : si "all", on va interroger et filtrer après coup dans cette route !
        targetStoreId = "all"
      } else {
        if (!managedStoreIds.includes(requestedStoreId)) {
          return NextResponse.json({ error: "Accès refusé : vous ne gérez pas cet établissement." }, { status: 403 })
        }
      }

      // Récupérer les données brutes (nous filtrerons si targetStoreId est "all")
      const rawData = await ConsolidatedService.getConsolidatedDashboard(startDate, endDate, "all")

      if (requestedStoreId === "all") {
        // Filtrer la comparaison des magasins et recalculer les KPIs
        const filteredStoreComparison = rawData.storeComparison.filter(sc => managedStoreIds.includes(sc.storeId))
        
        let filteredTotalCA = 0
        let filteredTotalMarge = 0
        let filteredTotalOrders = 0
        let filteredTotalCouverts = 0

        filteredStoreComparison.forEach(sc => {
          filteredTotalCA += sc.ca
          filteredTotalMarge += sc.marge
          filteredTotalOrders += sc.nbOrders
          filteredTotalCouverts += sc.nbCouverts
        })

        // Filtrer la timeline journalière
        // Pour la timeline, il faudrait normalement refaire l'aggregation par jour uniquement pour les magasins autorisés.
        // Faisons cela précisément :
        const reports = await prisma.consolidatedReport.findMany({
          where: {
            storeId: { in: managedStoreIds },
            date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
          },
          orderBy: { date: "asc" },
        })

        const dailyTimelineMap = new Map<string, any>()
        reports.forEach(r => {
          const dateKey = r.date.toISOString().split("T")[0]
          const cur = dailyTimelineMap.get(dateKey) || { date: dateKey, ca: 0, marge: 0, nbOrders: 0, nbCouverts: 0 }
          cur.ca += r.ca
          cur.marge += r.marge
          cur.nbOrders += r.nbOrders
          cur.nbCouverts += r.nbCouverts
          dailyTimelineMap.set(dateKey, cur)
        })

        return NextResponse.json({
          kpis: {
            totalCA: filteredTotalCA,
            totalMarge: filteredTotalMarge,
            totalOrders: filteredTotalOrders,
            totalCouverts: filteredTotalCouverts,
            averageOrderValue: filteredTotalOrders > 0 ? filteredTotalCA / filteredTotalOrders : 0,
            margePercentage: filteredTotalCA > 0 ? (filteredTotalMarge / filteredTotalCA) * 100 : 0,
          },
          storeComparison: filteredStoreComparison,
          timeline: Array.from(dailyTimelineMap.values()),
        }, { status: 200 })
      }
    }

    // Pour ADMIN ou SUPER_ADMIN ou STORE_MANAGER interrogeant un magasin spécifique autorisé
    const dashboardData = await ConsolidatedService.getConsolidatedDashboard(
      startDate,
      endDate,
      targetStoreId
    )

    return NextResponse.json(dashboardData, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
