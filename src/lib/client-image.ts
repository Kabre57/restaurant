'use client'

const DEFAULT_MAX_DIMENSION = 1280
const DEFAULT_OUTPUT_LIMIT_BYTES = 900 * 1024
const DEFAULT_QUALITY = 0.82

type OptimizeImageOptions = {
  maxDimension?: number
  maxOutputBytes?: number
  quality?: number
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || ''
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.ceil((base64.length * 3) / 4) - padding
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Impossible de lire l'image sélectionnée."))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Impossible de préparer l'image sélectionnée."))
    }

    image.src = objectUrl
  })
}

export async function optimizeImageFile(
  file: File,
  {
    maxDimension = DEFAULT_MAX_DIMENSION,
    maxOutputBytes = DEFAULT_OUTPUT_LIMIT_BYTES,
    quality = DEFAULT_QUALITY,
  }: OptimizeImageOptions = {}
) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner un fichier image valide.')
  }

  if (file.type === 'image/svg+xml') {
    return readFileAsDataUrl(file)
  }

  const image = await loadImageElement(file)
  const largestSide = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error("Le navigateur ne permet pas d'optimiser cette image.")
  }

  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  let currentQuality = quality
  let result = canvas.toDataURL('image/webp', currentQuality)

  while (estimateDataUrlBytes(result) > maxOutputBytes && currentQuality > 0.45) {
    currentQuality -= 0.08
    result = canvas.toDataURL('image/webp', currentQuality)
  }

  if (estimateDataUrlBytes(result) > maxOutputBytes) {
    throw new Error("L'image reste trop lourde après optimisation. Réduisez sa taille avant l'envoi.")
  }

  return result
}
