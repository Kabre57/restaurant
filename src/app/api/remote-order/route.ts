import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { OrderStatus, OrderType } from '@prisma/client'

/**
 * API pour recevoir des commandes de plateformes externes (Glovo, UberEats, etc.)
 * Sécurisée par une clé API simple pour l'exemple.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { apiKey, storeId, items, total, customerName, customerPhone, deliveryAddress } = body

    // 1. Vérification de sécurité (Clé API à configurer dans .env)
    if (apiKey !== process.env.EXTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 2. Création de la commande "Remote"
    const order = await prisma.order.create({
      data: {
        storeId,
        total,
        type: OrderType.DELIVERY,
        status: OrderStatus.EN_ATTENTE,
        clientRequestId: `remote_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            options: item.options || null
          }))
        }
      },
      include: {
        items: true
      }
    })

    // On pourrait ici ajouter des logs ou notifier le KDS via Redis

    return NextResponse.json({ 
      success: true, 
      orderId: order.id, 
      message: 'Commande reçue et ajoutée à la file d\'attente' 
    })

  } catch (error: any) {
    console.error('Erreur API Remote Order:', error)
    return NextResponse.json({ error: 'Échec du traitement de la commande' }, { status: 500 })
  }
}
