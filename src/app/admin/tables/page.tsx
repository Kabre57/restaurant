import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getStores } from '@/app/actions/store/stores'
import AdminTablesClient from './AdminTablesClient'

export const dynamic = 'force-dynamic'

export default async function AdminTablesPage() {
  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value
  const stores = await getStores()
  const storeOptions = stores.map((store) => ({ id: store.id, name: store.name }))
  const initialStoreId = storeOptions.some((store) => store.id === activeStoreId)
    ? activeStoreId
    : storeOptions[0]?.id

  const tables = initialStoreId
    ? await prisma.table.findMany({
      where: { storeId: initialStoreId },
      orderBy: { number: 'asc' },
    })
    : []

  const activeStoreName = storeOptions.find((store) => store.id === initialStoreId)?.name || 'Restaurant actif'
  const groups = initialStoreId
    ? [{
      storeId: initialStoreId,
      storeName: activeStoreName,
      items: tables.map((table) => ({
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        status: table.status,
        shape: table.shape,
        storeId: table.storeId,
      })),
    }]
    : []

  return (
    <AdminTablesClient
      groups={groups}
      totalCount={tables.length}
      occupiedCount={tables.filter((table) => table.status === 'OCCUPIED').length}
      storeOptions={storeOptions}
      activeStoreId={initialStoreId}
    />
  )
}
