import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LoyaltyService } from '@/services/loyalty.service'
import { earnLoyaltyPointsSchema, formatZodError } from '@/lib/validation/schemas'

/**
 * POST /api/loyalty/earn
 * Add points to a loyalty customer. Restricted to CASHIER, ADMIN, RESTAURATEUR.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['CASHIER', 'ADMIN', 'RESTAURATEUR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const parsed = earnLoyaltyPointsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { customerId, orderId, totalAmount } = parsed.data

    const result = await LoyaltyService.earnPoints(customerId, orderId, totalAmount)
    if (!result) {
      return NextResponse.json({ success: true, message: 'Montant insuffisant pour gagner des points' })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error POST /api/loyalty/earn:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
