import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'

export class ConsolidatedService {
  /**
   * Synchronise les statistiques d'un jour donné pour tous les établissements
   */
  static async syncDailyReports(date: Date) {
    const start = startOfDay(date)
    const end = endOfDay(date)

    const stores = await prisma.store.findMany({
      select: { id: true }
    })

    for (const store of stores) {
      // 1. Récupérer les commandes terminées du jour pour ce store
      const orders = await prisma.order.findMany({
        where: {
          storeId: store.id,
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED',
        },
        include: {
          items: {
            include: {
              product: {
                select: { costPrice: true }
              }
            }
          }
        }
      })

      // 2. Calculer le CA et la Marge
      let ca = 0
      let marge = 0
      let nbOrders = orders.length

      for (const order of orders) {
        ca += order.total
        for (const item of order.items) {
          const itemRevenue = item.quantity * item.price
          const costPrice = item.product?.costPrice || 0
          const itemCost = item.quantity * costPrice
          marge += (itemRevenue - itemCost)
        }
      }

      // 3. Calculer la fréquentation (réservations complétées/honorées)
      const reservations = await prisma.reservation.findMany({
        where: {
          storeId: store.id,
          date: { gte: start, lte: end },
          status: { in: ['CONFIRMED', 'SEATED', 'COMPLETED'] }
        }
      })
      const nbCouverts = reservations.reduce((sum, r) => sum + r.guests, 0)

      // 4. Enregistrer dans ConsolidatedReport
      try {
        await prisma.consolidatedReport.upsert({
          where: {
            storeId_date: {
              storeId: store.id,
              date: start,
            }
          },
          create: {
            storeId: store.id,
            date: start,
            ca,
            marge,
            nbOrders,
            nbCouverts: nbCouverts || nbOrders, // fallback à nbOrders s'il n'y a pas de couverts trackés
          },
          update: {
            ca,
            marge,
            nbOrders,
            nbCouverts: nbCouverts || nbOrders,
          }
        })
      } catch (err) {
        console.warn(`[ConsolidatedService] Erreur lors de l'enregistrement du rapport pour le magasin ${store.id}:`, err)
      }
    }
  }

  /**
   * Récupère le tableau de bord consolidé pour une plage de dates et un filtre d'établissement
   */
  static async getConsolidatedDashboard(startDate: Date, endDate: Date, storeId: string | 'all') {
    // 1. Synchronisation intelligente à la volée
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const todayStart = startOfDay(new Date()).getTime()

    for (const d of days) {
      const dStart = startOfDay(d)
      const isToday = dStart.getTime() === todayStart

      if (isToday) {
        // Toujours sync la journée en cours pour avoir les dernières données en temps réel
        await this.syncDailyReports(d)
      } else {
        // Sync uniquement s'il manque des données d'établissement pour cette date historique
        const existingCount = await prisma.consolidatedReport.count({
          where: { date: dStart }
        })
        const storesCount = await prisma.store.count()

        if (existingCount < storesCount) {
          await this.syncDailyReports(d)
        }
      }
    }

    // 2. Requête sur ConsolidatedReport pour la période
    const reports = await prisma.consolidatedReport.findMany({
      where: {
        storeId: storeId === 'all' ? undefined : storeId,
        date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
      include: {
        store: {
          select: { id: true, name: true }
        }
      },
      orderBy: { date: 'asc' },
    })

    // 3. Calculer les KPIs agrégés
    let totalCA = 0
    let totalMarge = 0
    let totalOrders = 0
    let totalCouverts = 0

    const storeStatsMap = new Map<string, {
      storeId: string
      storeName: string
      ca: number
      marge: number
      nbOrders: number
      nbCouverts: number
    }>()

    const dailyTimelineMap = new Map<string, {
      date: string
      ca: number
      marge: number
      nbOrders: number
      nbCouverts: number
    }>()

    for (const r of reports) {
      totalCA += r.ca
      totalMarge += r.marge
      totalOrders += r.nbOrders
      totalCouverts += r.nbCouverts

      // Aggregation par Store
      const storeIdKey = r.storeId
      const currentStore = storeStatsMap.get(storeIdKey) || {
        storeId: r.storeId,
        storeName: r.store.name,
        ca: 0,
        marge: 0,
        nbOrders: 0,
        nbCouverts: 0,
      }
      currentStore.ca += r.ca
      currentStore.marge += r.marge
      currentStore.nbOrders += r.nbOrders
      currentStore.nbCouverts += r.nbCouverts
      storeStatsMap.set(storeIdKey, currentStore)

      // Aggregation par Date
      const dateKey = r.date.toISOString().split('T')[0]
      const currentDay = dailyTimelineMap.get(dateKey) || {
        date: dateKey,
        ca: 0,
        marge: 0,
        nbOrders: 0,
        nbCouverts: 0,
      }
      currentDay.ca += r.ca
      currentDay.marge += r.marge
      currentDay.nbOrders += r.nbOrders
      currentDay.nbCouverts += r.nbCouverts
      dailyTimelineMap.set(dateKey, currentDay)
    }

    const averageOrderValue = totalOrders > 0 ? totalCA / totalOrders : 0
    const margePercentage = totalCA > 0 ? (totalMarge / totalCA) * 100 : 0

    return {
      kpis: {
        totalCA,
        totalMarge,
        totalOrders,
        totalCouverts,
        averageOrderValue,
        margePercentage,
      },
      storeComparison: Array.from(storeStatsMap.values()),
      timeline: Array.from(dailyTimelineMap.values()),
    }
  }
}
