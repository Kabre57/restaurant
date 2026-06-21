import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
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

  return NextResponse.json({
    success: true,
    action: 'open-cash-drawer',
    payload: {
      ...payload,
      storeId: session.user.storeId,
      userId: session.user.id,
      printerIps: printerIps.length > 0 ? printerIps : ['127.0.0.1'],
    }
  })
}
