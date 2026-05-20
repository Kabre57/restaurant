import { DeliveryPlatform, Priority, TicketStatus } from '@prisma/client'
import { z } from 'zod'

export const callServerSchema = z.object({
  storeId: z.string().min(1),
  tableId: z.string().min(1),
  tableNumber: z.union([z.string(), z.number()]).optional(),
})

export const mobilePaymentSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(['WAVE', 'ORANGE', 'MTN', 'MOOV', 'TRESOR']),
  phone: z.string().min(8).max(20),
  amount: z.coerce.number().positive(),
})

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(4000),
  priority: z.nativeEnum(Priority),
  userId: z.string().optional(),
})

export const supportStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(TicketStatus),
})

export const adminCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  storeId: z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal('')),
})

export const remoteOrderSchema = z.object({
  apiKey: z.string().optional(),
  platform: z.nativeEnum(DeliveryPlatform).optional(),
  externalOrderId: z.string().min(1),
  externalStoreId: z.string().optional(),
  storeId: z.string().optional(),
  items: z.array(z.unknown()).min(1),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
})

export const glovoWebhookSchema = z.object({
  order_code: z.string().min(1),
  store_id: z.string().min(1),
  items: z.array(z.unknown()).min(1),
  customer_notes: z.string().optional().nullable(),
  customer: z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  }).optional().nullable(),
  delivery_address: z.string().optional().nullable(),
})

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')
}
