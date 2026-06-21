import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateEscPosBuffer } from '@/lib/printService'

interface PrintItemPayload {
  name?: string
  quantity?: number
  price?: number
  priceHT?: number | null
  taxRate?: number | null
  priceTTC?: number | null
  barcode?: string | null
}

interface PrintOrderPayload {
  items?: PrintItemPayload[]
  paymentMode?: string
  total?: number
  discount?: number
  amountReceived?: number
  changeAmount?: number
  displayId?: string | number
  id?: string | number
  clientRequestId?: string | null
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

  // 1. Récupération des paramètres personnalisés et coordonnées du magasin
  const [settings, store] = await Promise.all([
    prisma.storeSettings.findUnique({
      where: { storeId: session.user.storeId }
    }),
    prisma.store.findUnique({
      where: { id: session.user.storeId }
    })
  ])

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
    priceHT: item.priceHT !== undefined && item.priceHT !== null ? Number(item.priceHT) : null,
    taxRate: item.taxRate !== undefined && item.taxRate !== null ? Number(item.taxRate) : null,
    priceTTC: item.priceTTC !== undefined && item.priceTTC !== null ? Number(item.priceTTC) : null,
    barcode: item.barcode || null,
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
    discount: order.discount || 0,
    paymentMode: order.paymentMode || '',
    amountReceived: order.amountReceived || 0,
    changeAmount: order.changeAmount || 0,
    orderNumber: String(order.displayId || order.id || ''),
    clientRequestId: order.clientRequestId || null,
    table: order.table || undefined,
    logoEscPos,
    headerText: settings?.receiptHeader || null,
    footerText: settings?.receiptFooter || null,
    qrData,
    cashierName: session.user.name || null,
    storeName: store?.name || null,
    storeAddress: store?.address || null,
    storePhone: store?.phone || null,
    storeEmail: store?.email || null,
    storeCode: store?.code || null,
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

  const printerConfigs = printers.length > 0
    ? printers.map(p => ({
        id: p.id,
        name: p.name,
        ipAddress: p.ipAddress || '127.0.0.1',
        type: p.type,
      }))
    : [
        {
          id: 'default',
          name: 'Imprimante par défaut',
          ipAddress: '127.0.0.1',
          type: 'ETHERNET',
        }
      ]

  return NextResponse.json({
    success: true,
    payload: base64Payload,
    printers: printerConfigs,
  })
}
