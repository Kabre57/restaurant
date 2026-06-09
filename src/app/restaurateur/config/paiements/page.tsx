'use client'

import { useSession } from 'next-auth/react'
import { PaymentMethodsSettings } from '@/components/config/PaymentMethodsSettings'

export default function PaymentSettingsPage() {
  const { data: session } = useSession()

  return (
    <PaymentMethodsSettings
      storeId={session?.user?.storeId}
      title="Modes de Paiement"
      description="Gérez les méthodes de paiement disponibles dans votre restaurant"
    />
  )
}
