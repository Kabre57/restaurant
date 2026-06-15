import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LoyaltyService } from '@/services/loyalty.service'
import { createLoyaltyCustomerSchema, formatZodError } from '@/lib/validation/schemas'

/**
 * GET /api/loyalty/customer?phone=...
 * Public consultation of points balance and transaction history
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const phone = searchParams.get('phone')?.trim()

    if (!phone) {
      return NextResponse.json({ error: 'Le numéro de téléphone est requis' }, { status: 400 })
    }

    const customer = await LoyaltyService.getCustomerByPhone(phone)
    if (!customer) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    console.error('Error GET /api/loyalty/customer:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}

/**
 * POST /api/loyalty/customer
 * Create a new loyalty customer. Restricted to CASHIER, ADMIN, RESTAURATEUR.
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

    const parsed = createLoyaltyCustomerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { phone, nom, email } = parsed.data

    const existing = await LoyaltyService.getCustomerByPhone(phone)
    if (existing) {
      return NextResponse.json({ error: 'Un client avec ce numéro de téléphone existe déjà' }, { status: 409 })
    }

    const customer = await LoyaltyService.createCustomer(phone, nom, email)
    return NextResponse.json({ success: true, customer }, { status: 201 })
  } catch (error) {
    console.error('Error POST /api/loyalty/customer:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
