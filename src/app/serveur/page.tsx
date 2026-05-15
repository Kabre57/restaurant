import { getCategories, getProductsByStore } from '@/app/actions/products'
import { getReservationsByStore } from '@/app/actions/reservations'
import { getTablesByStore } from '@/app/actions/tables'
import { getActiveOrders } from '@/app/actions/orders'
import POSClient from '@/components/pos/POSClient'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

export default async function ServeurPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'SERVER' && session.user.role !== 'RESTAURATEUR') {
    redirect('/')
  }

  const [categories, products, tables, reservations, activeOrders] = await Promise.all([
    getCategories(session.user.storeId),
    getProductsByStore(session.user.storeId),
    getTablesByStore(session.user.storeId),
    getReservationsByStore(session.user.storeId),
    getActiveOrders(session.user.storeId)
  ])

  return (
    <POSClient
      categories={categories}
      products={products}
      tables={tables}
      reservations={reservations as any}
      activeOrders={activeOrders as any}
      storeId={session.user.storeId}
      cashierId={session.user.id}
      operatorRole="SERVER"
      flowModeLocked
      initialFlowMode="TABLE_SERVICE"
      initialViewMode="FLOOR_PLAN"
    />
  )
}
