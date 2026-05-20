import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createCsv, createExcelHtml, createSimplePdf } from '@/lib/exports'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const format = req.nextUrl.searchParams.get('format') || 'csv'
  const storeId = req.nextUrl.searchParams.get('storeId') || session.user.storeId
  if (session.user.role !== 'ADMIN' && session.user.storeId !== storeId) {
    return new Response('Forbidden', { status: 403 })
  }

  const orders = await prisma.order.findMany({
    where: { ...(storeId ? { storeId } : {}) },
    take: 500,
    orderBy: { createdAt: 'desc' },
    include: { store: true, payments: true },
  })

  const headers = ['Date', 'Restaurant', 'Commande', 'Statut', 'Total', 'Paiement']
  const rows = orders.map((order) => [
    order.createdAt.toISOString(),
    order.store.name,
    order.id,
    order.status,
    order.total,
    order.payments[0]?.method || '',
  ])

  if (format === 'pdf') {
    const lines = rows.map((row) => `${row[0]} - ${row[1]} - ${row[3]} - ${row[4]} FCFA`)
    return fileResponse(createSimplePdf('Rapport ventes POS', lines), 'application/pdf', 'rapport-ventes.pdf')
  }

  if (format === 'xls') {
    return fileResponse(createExcelHtml('Rapport ventes POS', headers, rows), 'application/vnd.ms-excel', 'rapport-ventes.xls')
  }

  return fileResponse(createCsv(headers, rows), 'text/csv; charset=utf-8', 'rapport-ventes.csv')
}

function fileResponse(content: string, contentType: string, filename: string) {
  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
