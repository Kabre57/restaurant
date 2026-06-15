import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sendHardwareCommand } from '@/lib/hardware/agent'
import { prisma } from '@/lib/db'
import { generateEscPosBuffer } from '@/lib/printService'

interface PrintItemPayload {
  name?: string
  quantity?: number
  price?: number
}

interface PrintOrderPayload {
  items?: PrintItemPayload[]
  paymentMode?: string
  total?: number
  displayId?: string | number
  id?: string | number
  table?: string
  tableId?: string | null
}

interface PrintPayload {
  order?: PrintOrderPayload
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = (await req.json()) as PrintPayload
  const order = payload.order || {}

  // 1. Récupération des paramètres personnalisés du magasin
  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: session.user.storeId }
  })

  let logoEscPos: string | null = null
  if (settings?.receiptLogo) {
    try {
      const parsed = JSON.parse(settings.receiptLogo)
      logoEscPos = parsed.escpos || null
    } catch {
      // Rétrocompatibilité
      logoEscPos = settings.receiptLogo
    }
  }

  // 2. Compilation des articles pour le buffer d'impression
  const items = (order.items || []).map((item) => ({
    name: item.name || 'Produit',
    qty: item.quantity || 1,
    price: item.price || 0,
  }))

  const isPendingSettlement = order.paymentMode === 'A regler en caisse'

  let qrData: string | null = null
  if (session.user.storeId && order.tableId) {
    const origin = req.headers.get('origin') || req.nextUrl.origin
    qrData = `${origin}/order/${session.user.storeId}/${order.tableId}`
  }

  // 3. Génération du buffer ESC/POS
  const jobData = {
    title: isPendingSettlement ? 'Bon de Commande' : 'Ticket de Caisse',
    items,
    total: order.total || 0,
    orderNumber: String(order.displayId || order.id || ''),
    table: order.table || undefined,
    logoEscPos,
    headerText: settings?.receiptHeader || null,
    footerText: settings?.receiptFooter || null,
    qrData,
  }

  const escposBuffer = generateEscPosBuffer(jobData)
  const base64Payload = Buffer.from(escposBuffer).toString('base64')

  // 4. Recherche des imprimantes de tickets de caisse configurées pour le magasin
  const printers = await prisma.printer.findMany({
    where: {
      storeId: session.user.storeId,
      printReceipts: true,
    }
  })

  let successCount = 0
  let totalPrinters = printers.length

  if (totalPrinters > 0) {
    for (const printer of printers) {
      if (printer.ipAddress) {
        try {
          const res = await sendHardwareCommand('print-receipt', {
            printerIp: printer.ipAddress,
            payload: base64Payload,
          })
          if (res.success) successCount++
        } catch (err) {
          console.error(`Erreur d'impression sur ${printer.name}:`, err)
        }
      }
    }
  } else {
    // Fallback : Impression locale sur agent par défaut
    try {
      const res = await sendHardwareCommand('print-receipt', {
        printerIp: '127.0.0.1',
        payload: base64Payload,
      })
      if (res.success) successCount++
      totalPrinters = 1
    } catch (err) {
      console.error("Erreur d'impression locale par défaut:", err)
    }
  }

  return NextResponse.json({
    success: successCount > 0,
    message: `${successCount}/${totalPrinters} imprimante(s) ont traité le ticket.`
  })
}
