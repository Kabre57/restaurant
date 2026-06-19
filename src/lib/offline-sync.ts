import { z } from 'zod'

export const SYNC_ORDER_SCHEMA_VERSION = 2

export type SyncLocalStatus = 'PENDING_SYNC' | 'SYNCED' | 'FAILED'
export type SyncResultStatus = 'SYNCED' | 'REPLAYED' | 'CONFLICT' | 'FAILED'
export type SyncConflictReason = 'STOCK_INSUFFICIENT' | 'VALIDATION_FAILED' | 'UNKNOWN'
export type SyncPaymentStatus =
  | 'PAID'
  | 'PENDING'
  | 'EN_ATTENTE'
  | 'REUSSIE'
  | 'REUSSI'
  | 'ECHOUEE'
  | 'REMBOURSEE'

export type SyncJsonValue =
  | string
  | number
  | boolean
  | null
  | SyncJsonValue[]
  | { [key: string]: SyncJsonValue }

const syncJsonSchema: z.ZodType<SyncJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(syncJsonSchema),
    z.record(z.string(), syncJsonSchema),
  ])
)

export const syncLocalStatusSchema = z.enum(['PENDING_SYNC', 'SYNCED', 'FAILED'])
export const syncResultStatusSchema = z.enum(['SYNCED', 'REPLAYED', 'CONFLICT', 'FAILED'])
export const syncPaymentStatusSchema = z.enum([
  'PAID',
  'PENDING',
  'EN_ATTENTE',
  'REUSSIE',
  'REUSSI',
  'ECHOUEE',
  'REMBOURSEE',
])

export const syncOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().optional(),
  name: z.string().optional(),
  options: z.string().optional(),
})

export const syncOrderSchema = z.object({
  id: z.number().optional(),
  clientRequestId: z.string().min(1).optional(),
  storeId: z.string().min(1),
  cashierId: z.string().min(1).optional(),
  serverId: z.string().min(1).optional(),
  total: z.number().optional(),
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  paymentMode: z.string().optional(),
  paymentStatus: syncPaymentStatusSchema.optional(),
  tableId: z.string().min(1).optional(),
  discount: z.number().min(0).optional(),
  promotionId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  loyaltyPointsRedeemed: z.number().int().min(0).optional(),
  externalPayload: syncJsonSchema.optional(),
  items: z.array(syncOrderItemSchema).min(1),
  schemaVersion: z.number().int().positive().default(SYNC_ORDER_SCHEMA_VERSION),
  queuedAt: z.string().datetime().optional(),
  localStatus: syncLocalStatusSchema.default('PENDING_SYNC'),
  lastError: z.string().optional(),
})

export const syncBatchSchema = z.array(syncOrderSchema).min(1).max(10)

export const stockConflictDetailSchema = z.object({
  productId: z.string(),
  name: z.string(),
  requested: z.number(),
  available: z.number(),
})

export const syncOrderResultSchema = z.object({
  id: z.string(),
  clientRequestId: z.string().optional(),
  orderId: z.string().optional(),
  status: syncResultStatusSchema,
  reason: z.enum(['STOCK_INSUFFICIENT', 'VALIDATION_FAILED', 'UNKNOWN']).optional(),
  error: z.string().optional(),
  details: z.array(stockConflictDetailSchema).optional(),
})

export const syncBatchResponseSchema = z.object({
  results: z.array(syncOrderResultSchema),
})

export type SyncOrderInput = z.input<typeof syncOrderSchema>
export type ParsedSyncOrder = z.output<typeof syncOrderSchema>
export type SyncOrderResult = z.infer<typeof syncOrderResultSchema>
export type StockConflictDetail = z.infer<typeof stockConflictDetailSchema>

export function normalizeSyncPaymentStatus(status?: SyncPaymentStatus | string) {
  if (status === 'PAID' || status === 'REUSSI' || status === 'REUSSIE') return 'REUSSIE'
  if (status === 'PENDING' || status === 'EN_ATTENTE') return 'EN_ATTENTE'
  if (status === 'ECHOUEE') return 'ECHOUEE'
  if (status === 'REMBOURSEE') return 'REMBOURSEE'
  return 'REUSSIE'
}

export function syncResultIsSuccessful(status: SyncResultStatus) {
  return status === 'SYNCED' || status === 'REPLAYED'
}
