import { RoundingType } from '@prisma/client'

// applyRounding — Logique pure d'arrondi (déterministe, testable, utilisable sur client et serveur)
export function applyRounding(
  total: number,
  rounding: RoundingType,
  roundingValue: number
): number {
  if (rounding === 'NO_ROUNDING' || roundingValue <= 0) return total

  switch (rounding) {
    case 'ROUND_UP':
      return Math.ceil(total / roundingValue) * roundingValue

    case 'ROUND_DOWN':
      return Math.floor(total / roundingValue) * roundingValue

    case 'ROUND_NEAREST':
      return Math.round(total / roundingValue) * roundingValue

    default:
      return total
  }
}
