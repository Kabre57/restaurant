import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json()

  return NextResponse.json({
    success: true,
    action: 'payment-terminal',
    payload: {
      ...payload,
      storeId: session.user.storeId,
      userId: session.user.id,
    }
  })
}
