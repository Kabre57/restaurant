import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sendHardwareCommand } from '@/lib/hardware/agent'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json()
  const result = await sendHardwareCommand('payment-terminal', {
    ...payload,
    storeId: session.user.storeId,
    userId: session.user.id,
  })

  return NextResponse.json(result, { status: result.success ? 200 : 202 })
}
