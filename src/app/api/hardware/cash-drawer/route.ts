import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sendHardwareCommand } from '@/lib/hardware/agent'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json()

  // Find receipt printers configured for this store
  const printers = await prisma.printer.findMany({
    where: {
      storeId: session.user.storeId,
      printReceipts: true,
    }
  })

  const printerIps = printers.map(p => p.ipAddress).filter(Boolean) as string[]

  const result = await sendHardwareCommand('open-cash-drawer', {
    ...payload,
    storeId: session.user.storeId,
    userId: session.user.id,
    printerIps: printerIps.length > 0 ? printerIps : ['127.0.0.1'],
  })

  return NextResponse.json(result.data || result, { status: result.success ? 200 : 202 })
}
