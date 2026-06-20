import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/products
 * Récupère les produits d'un établissement avec leurs modificateurs (options).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId') || session?.user?.storeId

    if (!storeId) {
      return NextResponse.json({ error: 'ID de l\'établissement requis' }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: { storeId, isAvailable: true },
      include: {
        category: true,
        modifiers: true,
      },
      orderBy: { name: 'asc' },
    })

    const serializedProducts = products.map(p => ({
      ...p,
      priceHT: p.priceHT ? Number(p.priceHT) : null,
      taxRate: p.taxRate ? Number(p.taxRate) : null,
      priceTTC: p.priceTTC ? Number(p.priceTTC) : null,
    }))

    return NextResponse.json({ products: serializedProducts })
  } catch (error) {
    console.error('API Products Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
