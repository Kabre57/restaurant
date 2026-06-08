import PromotionManager from '@/components/catalog/PromotionManager'

export default function ReductionsPage() {
  return (
    <PromotionManager
      mode="restaurateur"
      title="Réductions & Promotions"
      description="Créez et gérez les codes de réduction applicables sur le point de vente"
      createLabel="Nouvelle Réduction"
    />
  )
}
