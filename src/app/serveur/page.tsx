import { getActiveOrders } from '@/app/actions/orders/orderQueries'
import { getStoreDetails } from '@/app/actions/store/stores'
import { getStoreSettings } from '@/app/actions/store/storeSettings'
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

  const [activeOrders, store, settingsRes] = await Promise.all([
    getActiveOrders(session.user.storeId),
    getStoreDetails(session.user.storeId),
    getStoreSettings(session.user.storeId)
  ])

  if (settingsRes.success && settingsRes.settings?.workflowType === 'CASHIER_ONLY') {
    redirect('/cashier')
  }

  return (
    <ServerTicketsClient
      initialOrders={activeOrders as any}
      storeId={session.user.storeId}
      storeName={store?.name || "Restaurant"}
      operatorName={session.user.name || "Serveur"}
    />
  )
}
