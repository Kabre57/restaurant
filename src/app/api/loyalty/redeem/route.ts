import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LoyaltyService } from '@/services/loyalty.service'
import { redeemLoyaltyPointsSchema, formatZodError } from '@/lib/validation/schemas'

/**
 * POST /api/loyalty/redeem
 * Redeem points for a reward. Restricted to CASHIER, ADMIN, RESTAURATEUR.
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

    const parsed = redeemLoyaltyPointsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { customerId, rewardId, orderId } = parsed.data

    try {
      const result = await LoyaltyService.redeemPoints(customerId, rewardId, orderId)
      return NextResponse.json({ success: true, ...result })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du rachat des points'
      return NextResponse.json({ error: msg }, { status: 422 })
    }
  } catch (error) {
    console.error('Error POST /api/loyalty/redeem:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
