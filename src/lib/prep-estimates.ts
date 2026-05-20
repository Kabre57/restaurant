type PrepEstimateItem = {
  productId: string
  quantity: number
}

type PrepEstimateProduct = {
  id: string
  averagePrepTimeMins?: number | null
}

export function getDefaultPrepMinutes(value?: number | null) {
  return Math.max(1, value || 15)
}

// Estime un temps global a partir du produit le plus long
// et ajoute un petit buffer quand plusieurs articles sortent ensemble.
export function computeEstimatedPrepMinutes(
  items: PrepEstimateItem[],
  products: PrepEstimateProduct[]
) {
  if (!items.length) return 0

  const durations = items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)
    const prepMinutes = getDefaultPrepMinutes(product?.averagePrepTimeMins)
    return Array.from({ length: Math.max(1, item.quantity) }, () => prepMinutes)
  })

  if (!durations.length) return 15

  const maxDuration = Math.max(...durations)
  const coordinationBuffer = durations.length > 3 ? Math.ceil((durations.length - 3) / 2) : 0
  return maxDuration + coordinationBuffer
}

export function formatEstimatedReadyTime(prepMinutes: number, baseDate = new Date()) {
  if (prepMinutes <= 0) return null

  return new Date(baseDate.getTime() + prepMinutes * 60_000).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
