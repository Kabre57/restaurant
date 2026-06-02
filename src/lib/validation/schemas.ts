import { DeliveryPlatform, OrderType, Priority, TicketStatus } from '@prisma/client'
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

/**
 * Schéma de création de commande POS (appel depuis le caissier web).
 * clientRequestId doit être un UUID v4 valide pour garantir l'idempotence
 * et éviter les collisions intentionnelles par manipulation de string.
 */
export const orderCreateSchema = z.object({
  clientRequestId: z.string().uuid('clientRequestId doit être un UUID v4').optional(),
  storeId: z.string().min(1, 'storeId requis'),
  type: z.nativeEnum(OrderType),
  paymentMode: z.string().optional(),
  tableId: z.string().optional(),
  promotionId: z.string().optional(),
  discount: z.number().min(0).optional(),
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive('Quantité doit être ≥ 1'),
    options: z.string().optional(),
  })).min(1, 'La commande doit contenir au moins un article'),
})

/** Schéma pour l'impression de ticket via l'agent hardware local */
export const hardwarePrintSchema = z.object({
  orderId: z.string().min(1),
  copies: z.number().int().min(1).max(5).default(1),
})

/** Schéma pour l'ouverture du tiroir-caisse */
export const hardwareDrawerSchema = z.object({
  reason: z.enum(['SALE', 'MANUAL_OPEN', 'FLOAT_CHECK']).default('SALE'),
})

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')
}

// ─── Produits (Server Actions) ───────────────────────────
export const createProductSchema = z.object({
  name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').max(100),
  price: z.number().positive('Le prix doit être positif'),
  categoryId: z.string().min(1, 'La catégorie est requise'),
  storeId: z.string().min(1, 'Le store est requis'),
  image: z.string().optional(),
  averagePrepTimeMins: z.number().int().min(1).max(180).optional(),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
})

export const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  price: z.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  image: z.string().optional(),
  averagePrepTimeMins: z.number().int().min(1).max(180).optional(),
  isAvailable: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  storeId: z.string().min(1).optional(),
})

// ─── Catégories (Server Actions) ─────────────────────────
export const updateCategorySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  imageUrl: z.string().optional(),
})

// ─── Inventaire / Ingrédients ────────────────────────────
export const createIngredientSchema = z.object({
  storeId: z.string().min(1, 'Le store est requis'),
  name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').max(80),
  unit: z.string().min(1, "L'unité est requise").max(20),
  quantity: z.number().min(0, 'La quantité doit être positive ou nulle'),
  minStock: z.number().min(0, 'Le stock minimum doit être positif ou nulle'),
})

export const updateInventorySchema = z.object({
  quantity: z.number().min(0, 'La quantité doit être positive ou nulle'),
  minStock: z.number().min(0, 'Le stock minimum doit être positif ou nulle'),
})

