import { prisma } from '@/lib/db'
import { ReservationStatus, TableStatus, Prisma } from '@prisma/client'
import { RealtimeService } from './realtime.service'
import { logger } from '@/lib/logger'
import { AnalyticsService } from './analytics.service'

export interface CreateReservationInput {
  storeId: string
  tableId: string
  customerName: string
  phone: string
  email?: string | null
  date: Date
  startTime: Date
  guests: number
}

export class BookingService {
  /**
   * Crée une réservation après vérification de la capacité et des conflits.
   */
  static async createReservation(input: CreateReservationInput) {
    const { storeId, tableId, customerName, phone, email, date, startTime, guests } = input

    // Calcul de la fin de la réservation (2 heures par défaut)
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000)

    // Démarrer une transaction Prisma
    return prisma.$transaction(async (tx) => {
      let targetTableId = tableId

      // 1. Recherche de table automatique si tableId === "auto"
      if (tableId === "auto") {
        const activeTables = await tx.table.findMany({
          where: { storeId, isActive: true, capacity: { gte: guests } },
          orderBy: { capacity: 'asc' },
        })

        let foundTable = null
        for (const t of activeTables) {
          const conflicting = await tx.reservation.findFirst({
            where: {
              tableId: t.id,
              status: {
                in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.SEATED],
              },
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          })
          if (!conflicting) {
            foundTable = t
            break
          }
        }

        if (!foundTable) {
          throw new Error("Aucune table disponible pour ce créneau et ce nombre de couverts")
        }
        targetTableId = foundTable.id
      }

      // 1b. Vérification de la table et de sa capacité
      const table = await tx.table.findUnique({
        where: { id: targetTableId },
      })

      if (!table) {
        throw new Error("La table spécifiée est introuvable")
      }
      if (!table.isActive) {
        throw new Error("Cette table n'est pas active pour les réservations")
      }
      if (table.capacity < guests) {
        throw new Error(`Capacité insuffisante : la table #${table.number} accueille max ${table.capacity} personnes (demandé: ${guests})`)
      }

      // 2. Vérification des conflits d'horaires (overlap) sur la même table
      // Deux réservations [A, B] et [C, D] se chevauchent si A < D et C < B
      const conflictingReservations = await tx.reservation.findMany({
        where: {
          tableId: targetTableId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.SEATED],
          },
          startTime: {
            lt: endTime,
          },
          endTime: {
            gt: startTime,
          },
        },
      })

      if (conflictingReservations.length > 0) {
        throw new Error("Table non disponible sur ce créneau horaire")
      }

      // 3. Création de la réservation
      const reservation = await tx.reservation.create({
        data: {
          storeId,
          tableId: targetTableId,
          customerName,
          phone,
          email,
          date,
          startTime,
          endTime,
          guests,
          status: ReservationStatus.PENDING,
        },
        include: {
          table: true,
        },
      })

      // 4. Log de l'action
      await tx.reservationLog.create({
        data: {
          reservationId: reservation.id,
          action: 'CREATED',
          details: `Création de la réservation pour ${guests} couverts le ${date.toLocaleDateString()}`,
        },
      })

      // Simulation d'envoi de notification
      logger.info(`[SMS/EMAIL SIMULATION] Envoi confirmation à ${customerName} (${phone}) : Réservation créée pour le ${startTime.toLocaleString()}`)

      // Notification temps réel
      await RealtimeService.publishBookingEvent(storeId, 'CREATED', reservation)

      // Invalider le cache analytics
      await AnalyticsService.invalidateStoreAnalytics(storeId);

      return reservation
    })
  }

  /**
   * Met à jour le statut d'une réservation avec gestion des effets secondaires
   */
  static async updateStatus(id: string, status: ReservationStatus, utilisateur?: string | null) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { table: true },
      })

      if (!reservation) {
        throw new Error("Réservation introuvable")
      }

      const oldStatus = reservation.status
      if (oldStatus === status) {
        return reservation
      }

      // Effets de transition de statut
      if (status === ReservationStatus.SEATED) {
        // Vérifier si la table est déjà occupée
        if (reservation.table.status === TableStatus.OCCUPIED) {
          throw new Error("Impossible d'installer le client : la table est déjà occupée")
        }

        // Mettre la table en OCCUPIED
        await tx.table.update({
          where: { id: reservation.tableId },
          data: { status: TableStatus.OCCUPIED },
        })

        // Créer une commande vide associée
        await tx.order.create({
          data: {
            storeId: reservation.storeId,
            tableId: reservation.tableId,
            reservationId: reservation.id,
            status: 'EN_ATTENTE',
            type: 'DINE_IN',
            total: 0.0,
            customerName: reservation.customerName,
            customerPhone: reservation.phone,
          },
        })

        // Publier mise à jour de la table
        await RealtimeService.publishTableEvent(reservation.storeId, 'TABLE_UPDATED', {
          id: reservation.tableId,
          status: TableStatus.OCCUPIED,
        })
      } else if (status === ReservationStatus.COMPLETED || status === ReservationStatus.CANCELLED) {
        // Libérer la table si elle était occupée
        if (reservation.table.status === TableStatus.OCCUPIED) {
          await tx.table.update({
            where: { id: reservation.tableId },
            data: { status: TableStatus.AVAILABLE },
          })

          await RealtimeService.publishTableEvent(reservation.storeId, 'TABLE_UPDATED', {
            id: reservation.tableId,
            status: TableStatus.AVAILABLE,
          })
        }
      }

      // Mettre à jour le statut
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: { status },
        include: { table: true, orders: true },
      })

      // Créer un log d'historique
      await tx.reservationLog.create({
        data: {
          reservationId: id,
          action: 'STATUS_CHANGED',
          details: `Statut changé de ${oldStatus} à ${status}`,
          utilisateur: utilisateur || null,
        },
      })

      // Simulation d'envoi si annulé ou confirmé
      if (status === ReservationStatus.CONFIRMED) {
        logger.info(`[SMS/EMAIL SIMULATION] Envoi confirmation à ${reservation.customerName} (${reservation.phone}) : Réservation confirmée !`)
      } else if (status === ReservationStatus.CANCELLED) {
        logger.info(`[SMS/EMAIL SIMULATION] Envoi annulation à ${reservation.customerName} (${reservation.phone}) : Réservation annulée.`)
      }

      // Notification temps réel
      await RealtimeService.publishBookingEvent(reservation.storeId, 'STATUS_CHANGED', updatedReservation)

      // Invalider le cache analytics
      await AnalyticsService.invalidateStoreAnalytics(reservation.storeId);

      return updatedReservation
    })
  }

  /**
   * Récupère la liste des réservations pour un magasin et éventuellement un jour donné
   */
  static async getReservations(storeId: string, dateStr?: string) {
    const where: Prisma.ReservationWhereInput = { storeId }

    if (dateStr) {
      const startOfDay = new Date(dateStr)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(dateStr)
      endOfDay.setHours(23, 59, 59, 999)

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    return prisma.reservation.findMany({
      where,
      include: {
        table: true,
        orders: true,
        logs: {
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })
  }

  /**
   * Récupère les tables d'un magasin avec leur statut actuel
   */
  static async getTables(storeId: string) {
    return prisma.table.findMany({
      where: { storeId, isActive: true },
      orderBy: { number: 'asc' },
    })
  }
}
