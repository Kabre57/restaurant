import { cookies } from 'next/headers'
import { getStores } from '@/app/actions/store/stores'
import { PaymentMethodsSettings } from '@/components/config/PaymentMethodsSettings'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentSettingsPage() {
  const cookieStore = await cookies()
  const activeStoreId = cookieStore.get('admin_active_store_id')?.value
  const stores = await getStores()
  const storeOptions = stores.map((store) => ({ id: store.id, name: store.name }))
  const initialStoreId = storeOptions.some((store) => store.id === activeStoreId)
    ? activeStoreId
    : storeOptions[0]?.id
  const activeStoreName = storeOptions.find((store) => store.id === initialStoreId)?.name

  return (
    <PaymentMethodsSettings
      storeId={initialStoreId}
      storeName={activeStoreName}
      title="Configuration des Paiements"
      description="Activez, masquez ou ajoutez les modes de paiement du restaurant actif"
      contextLabel="Restaurant actif"
    />
  )
}
