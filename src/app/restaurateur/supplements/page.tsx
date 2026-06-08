import ProductOptionsManager from '@/components/catalog/ProductOptionsManager'

export default function SupplementsPage() {
  return (
    <ProductOptionsManager
      mode="restaurateur"
      title="Modificateurs"
      description="Gérez les suppléments et retraits appliqués aux articles"
      createLabel="Ajouter Modificateur"
    />
  )
}
