import { prisma } from '@/lib/db'
import { StockTransferStatus } from '@prisma/client'

export class StockTransferService {
  /**
   * Crée une nouvelle demande de transfert de stock
   */
  static async createTransferRequest(data: {
    fromStoreId: string
    toStoreId: string
    productId: string
    quantity: number
    notes?: string
  }) {
    const { fromStoreId, toStoreId, productId, quantity, notes } = data

    if (quantity <= 0) {
      throw new Error("La quantité à transférer doit être supérieure à 0.")
    }

    if (fromStoreId === toStoreId) {
      throw new Error("L'établissement de départ et d'arrivée doivent être différents.")
    }

    // 1. Récupérer le produit source
    const sourceProduct = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!sourceProduct) {
      throw new Error("Produit source introuvable.")
    }

    if (sourceProduct.storeId !== fromStoreId) {
      throw new Error("Le produit n'appartient pas à l'établissement source.")
    }

    if (!sourceProduct.barcode) {
      throw new Error("Le produit n'a pas de code-barres configuré. Un code-barres est requis pour les transferts inter-établissements.")
    }

    // 2. Vérifier la disponibilité du stock
    if (sourceProduct.trackStock && sourceProduct.stockQuantity < quantity) {
      throw new Error(`Stock insuffisant dans l'établissement source (${sourceProduct.stockQuantity} disponibles, ${quantity} demandés).`)
    }

    // 3. Récupérer le produit de destination correspondant par barcode
    const targetProduct = await prisma.product.findFirst({
      where: {
        storeId: toStoreId,
        barcode: sourceProduct.barcode,
      },
    })

    if (!targetProduct) {
      throw new Error("Aucun produit correspondant avec le même code-barres n'a été trouvé dans l'établissement de destination.")
    }

    // 4. Créer la demande de transfert
    return prisma.stockTransfer.create({
      data: {
        fromStoreId,
        toStoreId,
        productId,
        quantity,
        status: 'PENDING',
        notes: notes || null,
      },
      include: {
        product: true,
        fromStore: true,
        toStore: true,
      },
    })
  }

  /**
   * Récupère la liste des transferts pour un établissement donné
   */
  static async getTransfersForStore(storeId: string) {
    return prisma.stockTransfer.findMany({
      where: {
        OR: [
          { fromStoreId: storeId },
          { toStoreId: storeId },
        ],
      },
      include: {
        product: true,
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: 'desc' },
    })
  }

  /**
   * Met à jour le statut d'un transfert de stock (Approuver, Rejeter, Compléter)
   * Déclenche les mouvements de stock réels si le transfert est approuvé ou complété.
   */
  static async updateTransferStatus(
    transferId: string,
    status: 'APPROVED' | 'REJECTED' | 'COMPLETED',
    userId: string
  ) {
    // 1. Récupérer le transfert existant
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        product: true,
        fromStore: true,
        toStore: true,
      },
    })

    if (!transfer) {
      throw new Error("Demande de transfert introuvable.")
    }

    if (transfer.status !== 'PENDING') {
      throw new Error(`Cette demande a déjà été traitée (Statut actuel : ${transfer.status}).`)
    }

    // Si rejeté, simple mise à jour du statut
    if (status === 'REJECTED') {
      return prisma.stockTransfer.update({
        where: { id: transferId },
        data: { status: 'REJECTED', completedAt: new Date() },
        include: {
          product: true,
          fromStore: true,
          toStore: true,
        },
      })
    }

    // Si approuvé ou complété, on valide les stocks et on effectue les écritures dans une transaction
    return prisma.$transaction(async (tx) => {
      // Re-vérifier le stock en temps réel dans la transaction
      const sourceProduct = await tx.product.findUnique({
        where: { id: transfer.productId },
      })

      if (!sourceProduct) {
        throw new Error("Produit source introuvable.")
      }

      if (sourceProduct.trackStock && sourceProduct.stockQuantity < transfer.quantity) {
        throw new Error(`Stock insuffisant en magasin source lors de la validation (${sourceProduct.stockQuantity} disponibles, ${transfer.quantity} requis).`)
      }

      // Trouver le produit cible dans la destination
      const targetProduct = await tx.product.findFirst({
        where: {
          storeId: transfer.toStoreId,
          barcode: sourceProduct.barcode,
        },
      })

      if (!targetProduct) {
        throw new Error("Produit cible introuvable dans l'établissement de destination.")
      }

      // a. Décrémentation du stock source
      if (sourceProduct.trackStock) {
        await tx.product.update({
          where: { id: sourceProduct.id },
          data: { stockQuantity: { decrement: transfer.quantity } },
        })

        // Enregistrer le mouvement de stock sortant
        await tx.stockMovement.create({
          data: {
            productId: sourceProduct.id,
            storeId: transfer.fromStoreId,
            quantity: -transfer.quantity,
            reason: 'TRANSFER_OUT',
            referenceId: transfer.id,
            note: `Transfert sortant #${transfer.id.slice(-6).toUpperCase()} vers ${transfer.toStore.name}`,
          },
        })
      }

      // b. Incrémentation du stock destination
      if (targetProduct.trackStock) {
        await tx.product.update({
          where: { id: targetProduct.id },
          data: { stockQuantity: { increment: transfer.quantity } },
        })

        // Enregistrer le mouvement de stock entrant
        await tx.stockMovement.create({
          data: {
            productId: targetProduct.id,
            storeId: transfer.toStoreId,
            quantity: transfer.quantity,
            reason: 'TRANSFER_IN',
            referenceId: transfer.id,
            note: `Transfert entrant #${transfer.id.slice(-6).toUpperCase()} depuis ${transfer.fromStore.name}`,
          },
        })
      }

      // c. Mettre à jour la demande de transfert
      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status,
          completedAt: new Date(),
        },
        include: {
          product: true,
          fromStore: true,
          toStore: true,
        },
      })
    })
  }
}
