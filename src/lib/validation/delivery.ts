import { z } from "zod";
import { DeliveryOrderStatus } from "@prisma/client";

export const estimateDeliverySchema = z.object({
  address: z.string().min(5, "L'adresse doit comporter au moins 5 caractères"),
  storeId: z.string().min(1, "Le storeId est requis"),
});

export const createDeliveryOrderSchema = z.object({
  orderId: z.string().min(1, "L'orderId est requis"),
  address: z.string().min(5, "L'adresse doit comporter au moins 5 caractères"),
  deliveryFee: z.number().nonnegative("Les frais de livraison ne peuvent pas être négatifs").optional(),
  estimatedTimeMinutes: z.number().int().positive().optional().nullable(),
  livreurId: z.string().optional().nullable(),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.nativeEnum(DeliveryOrderStatus),
  livreurId: z.string().optional().nullable(),
});

export const sendTrackingSchema = z.object({
  deliveryOrderId: z.string().min(1, "Le deliveryOrderId est requis"),
  latitude: z.number(),
  longitude: z.number(),
});
