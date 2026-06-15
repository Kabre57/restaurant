import { cookies } from 'next/headers'
import ProductOptionsManager from '@/components/catalog/ProductOptionsManager'
import { getStores } from '@/app/actions/store/stores'

export const dynamic = 'force-dynamic'

export default async function AdminSupplementsPage() {
  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value
  const stores = await getStores()
  const storeOptions = stores.map((store) => ({ id: store.id, name: store.name }))
  const initialStoreId = storeOptions.some((store) => store.id === activeStoreId)
    ? activeStoreId
    : storeOptions[0]?.id

  return (
    <ProductOptionsManager
      mode="admin"
      initialStoreId={initialStoreId}
      stores={storeOptions}
      title="Modificateurs"
      description="Gérez les suppléments et retraits du restaurant actif"
      createLabel="Ajouter Modificateur"
    />
  )
}
