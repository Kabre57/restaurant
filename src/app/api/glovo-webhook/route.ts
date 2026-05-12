import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { OrderStatus, OrderType } from '@prisma/client'

/**
 * WEBHOOK GLOVO
 * Cet endpoint reçoit les commandes envoyées par les serveurs de Glovo.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Structure type d'un payload Glovo (simplifiée pour l'exemple)
    const { 
      order_code,      // Identifiant Glovo
      store_id,        // Votre ID établissement chez Glovo
      items,           // Liste des produits
      total_amount,    // Prix total
      customer_notes   // Notes client
    } = body

    // 1. Sécurité : Vérifiez la signature Glovo (si fournie dans les headers)
    // const signature = req.headers.get('x-glovo-signature')
    
    // 2. Mapping vers votre base de données
    const order = await prisma.order.create({
      data: {
        // Nous mappons le store_id de Glovo vers votre storeId interne
        // Il est conseillé d'avoir un champ 'glovoStoreId' dans votre table Store
        store: { connect: { id: "store_01" } }, // Exemple statique
        total: total_amount / 100, // Souvent envoyé en centimes par les API
        type: OrderType.DELIVERY,
        status: OrderStatus.EN_ATTENTE,
        clientRequestId: `glovo_${order_code}`,
        items: {
          create: items.map((item: any) => ({
            // Ici, vous devrez faire une correspondance entre les IDs Glovo et vos IDs internes
            productId: item.external_id || "id_par_defaut", 
            quantity: item.quantity,
            price: item.unit_price / 100,
          }))
        }
      }
    })

    // 3. Réponse à Glovo (ils attendent souvent un 200 OK pour confirmer la réception)
    return NextResponse.json({ 
      status: "ACCEPTED",
      order_id: order.id 
    }, { status: 200 })

  } catch (error) {
    console.error('Erreur Webhook Glovo:', error)
    return NextResponse.json({ status: "REJECTED" }, { status: 500 })
  }
}
