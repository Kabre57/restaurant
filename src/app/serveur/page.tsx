import { getActiveOrders } from '@/app/actions/orders'
import { getStoreDetails } from '@/app/actions/stores'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import ServerTicketsClient from '@/components/serveur/ServerTicketsClient'

export default async function ServeurPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'SERVER' && session.user.role !== 'RESTAURATEUR') {
    redirect('/')
  }

  const [activeOrders, store] = await Promise.all([
    getActiveOrders(session.user.storeId),
    getStoreDetails(session.user.storeId)
  ])

  return (
    <ServerTicketsClient
      initialOrders={activeOrders as any}
      storeId={session.user.storeId}
      storeName={store?.name || "Restaurant"}
      operatorName={session.user.name || "Serveur"}
    />
  )
}
