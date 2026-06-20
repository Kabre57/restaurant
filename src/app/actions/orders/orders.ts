'use server'

import { OrderStatus, OrderType, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { computeEstimatedPrepMinutes } from '@/lib/prep-estimates'
import { orderCreateSchema } from '@/lib/validation/schemas'
import { checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { markOrderServed as markOrderServedAction, settleOrderPayment as settleOrderPaymentAction } from './orderLifecycle'
import { requireAuth, requireStoreAccess } from '@/shared/security'
import { DEFAULT_VAT_RATE } from '@/lib/tax'
import { syncOrdersWithCreateOrder } from '@/services/order/order-sync.service'
import type { SyncOrderInput } from '@/lib/offline-sync'

import {
  orderInclude,
  resolvePaymentMethodId,
  normalizePaymentStatus,
  buildEstimatedReadyAt,
  deductStockForItems,
  validateProductsAvailability,
  StockConflictError,
  validateAndAuditDiscount,
  tryMergeDineInOrder,
  handleLoyaltyPoints,
  notifyOrderCreated,
  notifyOrderUpdated,
} from '@/services/order'

function getItemUnitPrice(basePrice: number, optionsStr?: string | null): number {
  if (!optionsStr) return basePrice
  try {
    const parsed = JSON.parse(optionsStr)
    if (Array.isArray(parsed)) {
      const optionsPrice = parsed.reduce((sum, opt) => sum + (Number(opt.price) || 0), 0)
      return basePrice + optionsPrice
    }
  } catch {
    // Si ce n'est pas du JSON valide, on retourne le prix de base
  }
  return basePrice
}

export type OrderInput = {
  clientRequestId?: string
  storeId: string
  cashierId?: string
  serverId?: string
  /** @deprecated Ne plus passer total depuis le client — recalculé côté serveur */
  total?: number
  type: OrderType
  paymentMode?: string
  paymentStatus?: PaymentStatus | string
  items: {
    productId: string
    quantity: number
    /** @deprecated Ignoré — le prix est lu depuis la base de données */
    price?: number
    options?: string
  }[]
  tableId?: string
  promotionId?: string
  discount?: number
  customerId?: string
  loyaltyPointsRedeemed?: number
  externalPayload?: Prisma.InputJsonValue
}

/**
 * Server Action pour créer une commande (POS ou en ligne).
 * Valide les entrées, applique les contrôles de sécurité et de limites,
 * puis délègue la persistance et la fusion de commande aux services dédiés.
 */
export async function createOrder(data: OrderInput) {
  try {
    const sessionUser = await requireAuth()
    const securityUser = { id: sessionUser.id, role: sessionUser.role, storeId: sessionUser.storeId }

    // Rate limiting (5 req/minute)
    const headerList = await headers()
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown"
    const rateLimitResult = await checkRateLimit(`action-create-order:${ip}`, 5, 60)
    if (!rateLimitResult.allowed) {
      return { success: false, error: "Trop de requêtes. Réessayez plus tard." }
    }

    // Validation Zod (orderCreateSchema)
    const parsed = orderCreateSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: "Données de commande invalides" }
    }

    // Contrôles de sécurité (magasin et remises)
    requireStoreAccess(securityUser, data.storeId)
    await validateAndAuditDiscount(securityUser, data.storeId, data.discount)

    if (data.tableId) {
      const table = await prisma.table.findUnique({
        where: { id: data.tableId }
      })
      if (!table) {
        return { success: false, error: "Table introuvable" }
      }
      requireStoreAccess(securityUser, table.storeId)
    }

    const paymentStatus = normalizePaymentStatus(data.paymentStatus)
    const operatorId = data.cashierId || data.serverId

    const settings = await prisma.storeSettings.findUnique({
      where: { storeId: data.storeId }
    })

    if (settings?.workflowType === 'SERVER_FIRST' && data.type === 'DINE_IN' && !data.tableId) {
      return { success: false, error: "Une table est obligatoire pour le service en salle." }
    }

    if (settings?.workflowType === 'CASHIER_ONLY') {
      if (paymentStatus !== PaymentStatus.REUSSIE) {
        return { success: false, error: "Paiement échoué ou Payer" }
      }
    }

    if (!data.items.length) {
      return { success: false, error: "La commande ne contient aucun article" }
    }

    // Déduplication (Replay)
    if (data.clientRequestId) {
      const existingOrder = await prisma.order.findUnique({
        where: { clientRequestId: data.clientRequestId },
        include: orderInclude
      })

      if (existingOrder) {
        if (existingOrder.storeId !== data.storeId || (operatorId && existingOrder.cashierId !== operatorId)) {
          return { success: false, error: "Identifiant de synchronisation invalide" }
        }
        return { success: true, order: existingOrder, replayed: true }
      }
    }

    // Vérifier la disponibilité des articles
    const availableProducts = await validateProductsAvailability(data.storeId, data.items)

    // Recalcul sécurisé du total côté serveur
    const productPriceMap = new Map(availableProducts.map(p => [p.id, p.price]))
    const computedSubtotalIncludingTax = data.items.reduce((acc, item) => {
      const basePrice = productPriceMap.get(item.productId) ?? 0
      const unitPrice = getItemUnitPrice(basePrice, item.options)
      return acc + unitPrice * item.quantity
    }, 0)
    const computedDiscount = data.discount ?? 0
    const computedTotal = Math.max(0, computedSubtotalIncludingTax - computedDiscount)

    const paymentMethodId = await resolvePaymentMethodId(data.storeId, data.paymentMode as string)
    const estimatedPrepMinutes = computeEstimatedPrepMinutes(data.items, availableProducts)
    const estimatedReadyAt = buildEstimatedReadyAt(estimatedPrepMinutes)

    const order = await prisma.$transaction(async (tx) => {
      // Tenter la fusion si commande dine-in sur table existante
      const mergedOrder = await tryMergeDineInOrder(
        tx,
        data,
        productPriceMap,
        availableProducts,
        paymentMethodId,
        paymentStatus,
        sessionUser.id
      )
      if (mergedOrder) {
        return mergedOrder
      }

      // Résoudre LoyaltyCustomer
      let dbCustomerId: string | null = data.customerId || null

      if (data.customerId) {
        const lc = await tx.loyaltyCustomer.findUnique({
          where: { id: data.customerId }
        })
        if (lc) {
          dbCustomerId = null
        }
      }

      const productDetailMap = new Map(availableProducts.map(p => [p.id, p]))
      const defaultTaxRatePercent = settings?.defaultTaxRate ? Number(settings.defaultTaxRate) : 18.00

      const orderCreateData: Prisma.OrderUncheckedCreateInput = {
        clientRequestId: data.clientRequestId || null,
        storeId: data.storeId,
        cashierId: operatorId || null,
        tableId: data.tableId || null,
        customerId: dbCustomerId,
        total: computedTotal,
        type: data.type,
        status: OrderStatus.EN_ATTENTE,
        estimatedPrepMinutes,
        estimatedReadyAt,
        externalPayload: data.externalPayload ?? Prisma.JsonNull,
        items: {
          create: data.items.map(item => {
            const product = productDetailMap.get(item.productId)
            const basePrice = product?.price ?? 0
            const unitPrice = getItemUnitPrice(basePrice, item.options)
            const itemTaxRatePercent = (product && product.taxRate !== null) ? Number(product.taxRate) : defaultTaxRatePercent
            const itemTaxRateDecimal = itemTaxRatePercent / 100
            const unitHt = unitPrice / (1 + itemTaxRateDecimal)
            const lineTax = (unitPrice - unitHt) * item.quantity
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: unitPrice,
              priceExcludingTax: Math.round(unitHt * 100) / 100,
              taxRate: itemTaxRateDecimal,
              taxAmount: Math.round(lineTax * 100) / 100,
              options: item.options
            }
          })
        },
        payments: {
          create: {
            paymentMethodId: paymentMethodId,
            status: paymentStatus,
            amount: computedTotal
          }
        }
      }

      const createOrderRecord = async () => {
        try {
          return await tx.order.create({
            data: {
              ...orderCreateData,
              discount: data.discount || 0,
              promotionId: data.promotionId || null,
              customerId: dbCustomerId,
              loyaltyPointsRedeemed: data.loyaltyPointsRedeemed || 0,
            },
            include: orderInclude
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          if (message.includes('Unknown argument')) {
            console.warn("Fallback creation order: some fields are not supported by the current client")
            return tx.order.create({
              data: orderCreateData,
              include: orderInclude
            })
          }
          throw error
        }
      }

      const newOrder = await createOrderRecord()

      // Déduire les stocks physiques & ingrédients
      await deductStockForItems(tx, data.storeId, data.items, availableProducts, newOrder.id)

      if (data.promotionId) {
        await tx.promotion.update({
          where: { id: data.promotionId },
          data: { usedCount: { increment: 1 } }
        })
      }

      // Traiter la fidélité
      if (paymentStatus === PaymentStatus.REUSSIE && data.customerId) {
        await handleLoyaltyPoints(tx, newOrder.id, data.customerId, computedTotal, data.loyaltyPointsRedeemed, true)
      }

      return newOrder
    })

    if (data.type === 'DELIVERY') {
      const payload = (data.externalPayload as Record<string, unknown> | null) || {}
      try {
        const { DeliveryService } = await import("@/services/delivery.service");
        const deliveryAddress = typeof payload.deliveryAddress === "string" && payload.deliveryAddress.trim().length > 0
          ? payload.deliveryAddress
          : "Abidjan";
        await DeliveryService.createDeliveryOrder({
          orderId: order.id,
          address: deliveryAddress,
          livreurId: (payload.deliveryLivreurId as string) || null,
        });
      } catch (err) {
        console.error("Failed to create DeliveryOrder via DeliveryService, falling back:", err);
        const deliveryAddress = typeof payload.deliveryAddress === "string" && payload.deliveryAddress.trim().length > 0
          ? payload.deliveryAddress
          : "Abidjan";
        await prisma.deliveryOrder.create({
          data: {
            orderId: order.id,
            address: deliveryAddress,
            status: 'PENDING',
            distanceKm: null,
            deliveryFee: 0,
            livreurId: (payload.deliveryLivreurId as string) || null,
          }
        });
      }
    }

    // Publier les notifications
    await notifyOrderCreated(order)

    return { success: true, order }
  } catch (error) {
    if (error instanceof StockConflictError) {
      return {
        success: false,
        status: 'CONFLICT' as const,
        reason: error.reason,
        error: error.message,
        details: error.details,
      }
    }
    console.error("Failed to create order:", error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, error: "Erreur lors de la création de la commande: " + errorMessage }
  }
}

/**
 * Ajoute des articles supplémentaires à une commande existante.
 * Recalcule le montant, met à jour le statut et met à jour les stocks.
 */
export async function addItemsToOrder(orderId: string, items: OrderInput['items'], _ignoredTotal?: number) {
  void _ignoredTotal

  try {
    let newStatus: OrderStatus = OrderStatus.EN_ATTENTE
    if (!items.length) {
      return { success: false, error: "Aucun article à ajouter" }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return { success: false, error: "Commande introuvable" }
    }

    const itemProductIds = items.map(i => i.productId)
    const itemProducts = await prisma.product.findMany({
      where: { id: { in: itemProductIds } },
      select: { id: true, price: true, name: true, trackStock: true, stockQuantity: true, minStockLevel: true, priceHT: true, taxRate: true, priceTTC: true }
    })
    const itemPriceMap = new Map(itemProducts.map(p => [p.id, p.price]))
    const addedTotal = items.reduce((acc, i) => {
      const basePrice = itemPriceMap.get(i.productId) ?? 0
      const unitPrice = getItemUnitPrice(basePrice, i.options)
      return acc + unitPrice * i.quantity
    }, 0)

    const settings = await prisma.storeSettings.findUnique({
      where: { storeId: order.storeId }
    })
    const defaultTaxRatePercent = settings?.defaultTaxRate ? Number(settings.defaultTaxRate) : 18.00

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.update({
        where: { id: orderId },
        data: {
          total: { increment: addedTotal },
          status: newStatus,
          actualPrepMinutes: null,
          preparationStartedAt: newStatus === OrderStatus.EN_ATTENTE ? null : order.preparationStartedAt,
          readyAt: null,
          servedAt: null,
          items: {
            create: items.map(item => {
              const product = itemProducts.find(p => p.id === item.productId)
              const basePrice = product?.price ?? 0
              const unitPrice = getItemUnitPrice(basePrice, item.options)
              const itemTaxRatePercent = (product && product.taxRate !== null) ? Number(product.taxRate) : defaultTaxRatePercent
              const itemTaxRateDecimal = itemTaxRatePercent / 100
              const unitHt = unitPrice / (1 + itemTaxRateDecimal)
              const lineTax = (unitPrice - unitHt) * item.quantity
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: unitPrice,
                priceExcludingTax: Math.round(unitHt * 100) / 100,
                taxRate: itemTaxRateDecimal,
                taxAmount: Math.round(lineTax * 100) / 100,
                options: item.options
              }
            })
          }
        },
        include: orderInclude
      })

      const estimatedPrepMinutes = computeEstimatedPrepMinutes(
        orderUpdate.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        orderUpdate.items.map((item) => ({
          id: item.productId,
          averagePrepTimeMins: item.product.averagePrepTimeMins,
        }))
      )

      const estimateBase = (newStatus as string) === OrderStatus.PREPARATION && order.preparationStartedAt
        ? new Date(order.preparationStartedAt)
        : new Date()

      const orderWithEstimate = await tx.order.update({
        where: { id: orderId },
        data: {
          estimatedPrepMinutes,
          estimatedReadyAt: buildEstimatedReadyAt(estimatedPrepMinutes, estimateBase),
        },
        include: orderInclude
      })

      // Déduire les stocks
      await deductStockForItems(tx, order.storeId, items, itemProducts, orderId)

      return orderWithEstimate
    })

    const pendingPayment = await prisma.payment.findFirst({
      where: { orderId: orderId, status: PaymentStatus.EN_ATTENTE }
    })

    if (pendingPayment) {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: { amount: { increment: addedTotal } }
      })
    } else {
      const paidPaymentCount = await prisma.payment.count({
        where: {
          orderId,
          status: PaymentStatus.REUSSIE,
        }
      })

      if (paidPaymentCount > 0) {
        await prisma.payment.create({
          data: {
            orderId,
            paymentMethodId: await resolvePaymentMethodId(order.storeId, 'ESPECES'),
            status: PaymentStatus.EN_ATTENTE,
            amount: addedTotal,
          }
        })
      }
    }

    await notifyOrderUpdated(updatedOrder)

    return { success: true, order: updatedOrder }
  } catch (error) {
    console.error("Failed to add items to order:", error)
    return { success: false, error: "Erreur lors de l'ajout des articles" }
  }
}

export async function settleOrderPayment(orderId: string, paymentMode: string, storeId?: string) {
  return settleOrderPaymentAction(orderId, paymentMode, storeId)
}

export async function markOrderServed(orderId: string, storeId?: string) {
  return markOrderServedAction(orderId, storeId)
}

/**
 * Synchronise un lot de commandes (jusqu'à 10 à la fois).
 */
export async function syncOrdersBatch(orders: SyncOrderInput[]) {
  return syncOrdersWithCreateOrder(orders, createOrder)
}