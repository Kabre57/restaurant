import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LoyaltyService } from '@/services/loyalty.service'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createRewardSchema = z.object({
  code: z.string().trim().min(3).max(50),
  label: z.string().trim().min(3).max(100),
  description: z.string().trim().max(255).optional().nullable(),
  pointsCost: z.number().int().positive(),
})

/**
 * GET /api/loyalty/rewards
 * Get all active rewards. Publicly accessible.
 */
export async function GET() {
  try {
    await LoyaltyService.seedDefaultRewardsIfNeeded()
    const rewards = await LoyaltyService.getRewards()
    return NextResponse.json({ success: true, rewards })
  } catch (error) {
    console.error('Error GET /api/loyalty/rewards:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}

/**
 * POST /api/loyalty/rewards
 * Create a new reward. Restricted to ADMIN and RESTAURATEUR.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'RESTAURATEUR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const parsed = createRewardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 })
    }

    const { code, label, description, pointsCost } = parsed.data

    const existing = await prisma.loyaltyReward.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Une récompense avec ce code existe déjà' }, { status: 409 })
    }

    const reward = await prisma.loyaltyReward.create({
      data: {
        code,
        label,
        description: description || null,
        pointsCost,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, reward }, { status: 201 })
  } catch (error) {
    console.error('Error POST /api/loyalty/rewards:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}

/**
 * DELETE /api/loyalty/rewards?id=...
 * Deactivate or delete a reward. Restricted to ADMIN and RESTAURATEUR.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'RESTAURATEUR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    // Instead of deleting, we toggle isActive to false so existing transaction records stay intact
    const reward = await prisma.loyaltyReward.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, reward })
  } catch (error) {
    console.error('Error DELETE /api/loyalty/rewards:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
