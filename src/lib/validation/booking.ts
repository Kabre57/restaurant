import { z } from 'zod'
import { ReservationStatus } from '@prisma/client'

export const createReservationSchema = z.object({
  storeId: z.string().min(1, "Le store est requis"),
  tableId: z.string().min(1, "La table est requise"),
  customerName: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
  phone: z.string().min(5, "Le numéro de téléphone doit comporter au moins 5 caractères"),
  email: z.string().email("Email invalide").optional().or(z.literal("")).nullable(),
  date: z.coerce.date(),
  startTime: z.coerce.date(),
  guests: z.number().int().positive("Le nombre de couverts doit être supérieur à 0"),
})

export const updateReservationStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus),
  utilisateur: z.string().optional().nullable(),
})

export const cancelReservationSchema = z.object({
  reason: z.string().min(1, "Le motif de l'annulation est requis"),
  utilisateur: z.string().optional().nullable(),
})
