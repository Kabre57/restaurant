import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getFinancialSummary } from '@/app/actions/analytics/finances'
import { createCsv, createExcelHtml, createSimplePdf } from '@/lib/exports'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return new Response('Forbidden', { status: 403 })

  const format = req.nextUrl.searchParams.get('format') || 'csv'
  const data = await getFinancialSummary()
  if (!data) return new Response('No data', { status: 500 })

  const headers = ['Restaurant', 'CA encaisse', 'Commission %', 'Commission', 'Net restaurateur', 'Commandes']
  const rows = data.stores.map((store) => [
    store.name,
    store.revenue,
    store.commissionRate,
    Math.round(store.commission),
    Math.round(store.netToRestaurant),
    store.orderCount,
  ])

  if (format === 'pdf') {
    const lines = [
      `Volume encaisse: ${Math.round(data.totalVolume).toLocaleString()} FCFA`,
      `Commissions: ${Math.round(data.totalCommission).toLocaleString()} FCFA`,
      `Net restaurateurs: ${Math.round(data.totalNetToRestaurants).toLocaleString()} FCFA`,
      '',
      ...rows.map((row) => `${row[0]} - CA ${row[1]} FCFA - Commission ${row[3]} FCFA - Net ${row[4]} FCFA`),
    ]
    return fileResponse(createSimplePdf('Rapport finances POS', lines), 'application/pdf', 'rapport-finances.pdf')
  }

  if (format === 'xls') {
    return fileResponse(
      createExcelHtml('Rapport finances POS', headers, rows),
      'application/vnd.ms-excel',
      'rapport-finances.xls'
    )
  }

  return fileResponse(createCsv(headers, rows), 'text/csv; charset=utf-8', 'rapport-finances.csv')
}

function fileResponse(content: string, contentType: string, filename: string) {
  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
