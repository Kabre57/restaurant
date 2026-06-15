import { cookies } from 'next/headers'
import PromotionManager from '@/components/catalog/PromotionManager'
import { getStores } from '@/app/actions/store/stores'

export const dynamic = 'force-dynamic'

export default async function PromotionsAdminPage() {
  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value
  const stores = await getStores()
  const storeOptions = stores.map((store) => ({ id: store.id, name: store.name }))
  const initialStoreId = storeOptions.some((store) => store.id === activeStoreId)
    ? activeStoreId
    : storeOptions[0]?.id

  return (
    <PromotionManager
      mode="admin"
      initialStoreId={initialStoreId}
      stores={storeOptions}
      title="Gestion des Promotions"
      description="Créez et gérez les codes de réduction du restaurant actif"
      createLabel="Nouvelle Promo"
    />
  )
}
