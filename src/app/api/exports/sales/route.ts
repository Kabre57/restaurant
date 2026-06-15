import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { createCsv, createExcelHtml, createSimplePdf } from '@/lib/exports'
import { format } from 'date-fns'

// Force dynamic pour les exports (jamais de cache)
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const params = req.nextUrl.searchParams
  const exportFormat = params.get('format') || 'csv'
  const storeId = params.get('storeId') || session.user.storeId

  if (session.user.role !== 'ADMIN' && session.user.storeId !== storeId) {
    return new Response('Forbidden', { status: 403 })
  }

  // Filtres date optionnels (YYYY-MM-DD)
  const fromParam = params.get('from')
  const toParam = params.get('to')
  const from = fromParam ? new Date(fromParam) : undefined
  const to = toParam ? new Date(toParam + 'T23:59:59.999Z') : undefined

  const orders = await prisma.order.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      } : {}),
    },
    take: 1000,
    orderBy: { createdAt: 'desc' },
    include: {
      store: { select: { name: true } },
      payments: { select: { paymentMethod: { select: { name: true } }, amount: true, status: true } },
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { name: true } },
        },
      },
    },
  })

  // Nom du fichier avec période si filtre date
  const periodSuffix = fromParam ? `_${fromParam}` : ''
  const fileBase = `rapport-ventes${periodSuffix}`

  const headers = ['Date', 'Restaurant', 'Commande ID', 'Type', 'Statut', 'Total (FCFA)', 'Paiement', 'Articles']
  const rows = orders.map((order) => [
    format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm'),
    order.store.name,
    order.id.slice(-8).toUpperCase(),
    order.type,
    order.status,
    order.total,
    order.payments[0]?.paymentMethod?.name || 'N/A',
    order.items.map((item) => `${item.quantity}x ${item.product.name}`).join(' | '),
  ])

  if (exportFormat === 'pdf') {
    const title = `Rapport ventes POS${fromParam ? ` — du ${fromParam}` : ''}`
    const lines = rows.map((row) => `${row[0]} | ${row[1]} | ${row[4]} | ${row[5]} FCFA`)
    return fileResponse(createSimplePdf(title, lines), 'application/pdf', `${fileBase}.pdf`)
  }

  if (exportFormat === 'xls') {
    return fileResponse(
      createExcelHtml('Rapport ventes POS', headers, rows),
      'application/vnd.ms-excel',
      `${fileBase}.xls`
    )
  }

  if (exportFormat === 'json') {
    const json = JSON.stringify(orders.map((o) => ({
      id: o.id,
      date: o.createdAt,
      store: o.store.name,
      status: o.status,
      type: o.type,
      total: o.total,
      payment: o.payments[0]?.paymentMethod?.name,
      items: o.items.map((item) => ({ name: item.product.name, qty: item.quantity, price: item.price })),
    })), null, 2)
    return fileResponse(json, 'application/json', `${fileBase}.json`)
  }

  return fileResponse(createCsv(headers, rows), 'text/csv; charset=utf-8', `${fileBase}.csv`)
}

function fileResponse(content: string, contentType: string, filename: string) {
  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

