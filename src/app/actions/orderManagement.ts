'use server'

import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { publishOrderEvent, publishStockAlert } from './orderNotifications'
import { decrementIngredientInventory, incrementIngredientInventory } from './inventory'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'

const orderInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  },
  payments: true,
  table: true,
}

/**
 * Annuler une commande et recréditer ses stocks.
 */
export async function cancelOrder(orderId: string) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!order) {
      return { success: false, error: 'Commande introuvable' }
    }

    if (role !== "ADMIN") {
      assertSameStore(order.storeId, authStoreId)
    }

    if (order.status === OrderStatus.CANCELLED) {
      return { success: false, error: 'La commande est déjà annulée' }
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Recréditer les stocks des produits suivis
      for (const item of order.items) {
        // Recréditer en cascade la recette (ingrédients & emballages)
        await incrementIngredientInventory(tx, order.storeId, item.productId, item.quantity)

        if (item.product && item.product.trackStock) {
          const newQuantity = item.product.stockQuantity + item.quantity

          // Mise à jour du stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newQuantity },
          })

          // Audit trail : Enregistrement du mouvement de stock positif
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              storeId: order.storeId,
              quantity: item.quantity, // Positif = entrée/retour
              reason: 'ADJUSTMENT',
              referenceId: order.id,
            },
          })
        }
      }

      // 2. Mettre à jour le statut de la commande
      const nextOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: orderInclude,
      })

      // 3. Mettre à jour le statut des paiements en attente ou réussis
      await tx.payment.updateMany({
        where: { orderId, status: PaymentStatus.EN_ATTENTE },
        data: { status: PaymentStatus.ECHOUEE },
      })

      return nextOrder
    })

    // Publier l'événement de mise à jour pour le KDS, le serveur et la caisse
    await publishOrderEvent('order-updated', updatedOrder)
    revalidatePath('/restaurateur/commandes')

    return { success: true, order: updatedOrder }
  } catch (error) {
    console.error('Failed to cancel order:', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, error: "Erreur lors de l'annulation de la commande : " + message }
  }
}

/**
 * Modifier la commande (ajustement de panier en direct avec recalcul et mouvement de stocks).
 */
export async function modifyOrder(
  orderId: string,
  updatedItems: { productId: string; quantity: number; options?: string }[]
) {
  const { storeId: authStoreId, role } = await requireAuth(["ADMIN", "RESTAURATEUR", "CASHIER", "SERVER"])

  try {
    if (!updatedItems.length) {
      return { success: false, error: 'La commande doit contenir au moins un article' }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    })

    if (!order) {
      return { success: false, error: 'Commande introuvable' }
    }

    if (role !== "ADMIN") {
      assertSameStore(order.storeId, authStoreId)
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      return { success: false, error: 'Impossible de modifier une commande annulée ou terminée' }
    }

    // Récupérer les infos des nouveaux produits pour les prix et stocks
    const productIds = [...new Set(updatedItems.map((item) => item.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Calculer la différence entre l'ancien panier et le nouveau panier pour chaque produit
      const oldQuantitiesMap = new Map<string, number>()
      for (const item of order.items) {
        oldQuantitiesMap.set(item.productId, (oldQuantitiesMap.get(item.productId) || 0) + item.quantity)
      }

      const newQuantitiesMap = new Map<string, number>()
      for (const item of updatedItems) {
        newQuantitiesMap.set(item.productId, (newQuantitiesMap.get(item.productId) || 0) + item.quantity)
      }

      // Parcourir tous les produits affectés (anciens ou nouveaux)
      const allProductIds = new Set([...oldQuantitiesMap.keys(), ...newQuantitiesMap.keys()])

      for (const productId of allProductIds) {
        const oldQty = oldQuantitiesMap.get(productId) || 0
        const newQty = newQuantitiesMap.get(productId) || 0
        const diff = newQty - oldQty

        if (diff === 0) continue

        const product = productMap.get(productId) || await tx.product.findUnique({ where: { id: productId } })
        if (!product) continue

        // Ajustement en cascade de la recette (ingrédients & emballages)
        if (diff > 0) {
          await decrementIngredientInventory(tx, order.storeId, productId, diff)
        } else {
          await incrementIngredientInventory(tx, order.storeId, productId, Math.abs(diff))
        }

        if (product.trackStock) {
          if (diff > 0) {
            // Augmentation : on retire du stock
            const newStock = Math.max(0, product.stockQuantity - diff)
            await tx.product.update({
              where: { id: productId },
              data: { stockQuantity: newStock },
            })

            // Audit
            await tx.stockMovement.create({
              data: {
                productId,
                storeId: order.storeId,
                quantity: -diff, // Négatif = sortie
                reason: 'SALE',
                referenceId: order.id,
              },
            })

            if (newStock < product.minStockLevel) {
              await publishStockAlert(order.storeId, { name: product.name, stockQuantity: newStock })
            }
          } else {
            // Diminution : on recrédite le stock
            const refundQty = Math.abs(diff)
            const newStock = product.stockQuantity + refundQty
            await tx.product.update({
              where: { id: productId },
              data: { stockQuantity: newStock },
            })

            // Audit
            await tx.stockMovement.create({
              data: {
                productId,
                storeId: order.storeId,
                quantity: refundQty, // Positif = entrée
                reason: 'ADJUSTMENT',
                referenceId: order.id,
              },
            })
          }
        }
      }

      // 2. Vider les anciens OrderItems et recréer les nouveaux
      await tx.orderItem.deleteMany({
        where: { orderId },
      })

      let computedTotal = 0
      const orderItemsToCreate = []

      for (const item of updatedItems) {
        const product = productMap.get(item.productId)
        if (!product) throw new Error(`Produit introuvable : ${item.productId}`)

        computedTotal += product.price * item.quantity

        orderItemsToCreate.push({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          options: item.options || null,
        })
      }

      await tx.orderItem.createMany({
        data: orderItemsToCreate,
      })

      // 3. Mettre à jour le montant total de la commande
      const finalOrder = await tx.order.update({
        where: { id: orderId },
        data: { total: computedTotal },
        include: orderInclude,
      })

      // 4. Mettre à jour le paiement associé (si existant et en attente)
      const pendingPayment = await tx.payment.findFirst({
        where: { orderId, status: PaymentStatus.EN_ATTENTE },
      })

      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: { amount: computedTotal },
        })
      } else {
        // Si le paiement est réussi mais que le montant a changé, on peut ajuster la différence
        const succeededPayment = await tx.payment.findFirst({
          where: { orderId, status: PaymentStatus.REUSSIE },
        })
        if (succeededPayment) {
          await tx.payment.update({
            where: { id: succeededPayment.id },
            data: { amount: computedTotal },
          })
        }
      }

      return finalOrder
    })

    await publishOrderEvent('order-updated', updatedOrder)
    revalidatePath('/restaurateur/commandes')

    return { success: true, order: updatedOrder }
  } catch (error) {
    console.error('Failed to modify order:', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, error: 'Erreur lors de la modification de la commande : ' + message }
  }
}
