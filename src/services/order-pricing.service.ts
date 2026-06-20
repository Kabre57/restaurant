import { DEFAULT_VAT_RATE } from '@/constants/taxes'

export interface PricingBreakdown {
  subtotalExcludingTax: number // HT
  taxAmount: number            // TVA
  totalIncludingTax: number    // TTC
}

/**
 * Arrondit un montant de devise à deux décimales.
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Service de calcul des prix et taxes de commande.
 * Standardise le calcul HT et TVA depuis le montant TTC global.
 */
export class OrderPricingService {
  /**
   * Calcule la ventilation des taxes à partir du montant TTC (les prix produits étant TTC).
   * Formule : HT = TTC / (1 + taux) et TVA = HT * taux.
   *
   * @param totalIncludingTax Montant total TTC
   * @param taxRate Taux de TVA (par défaut 0.18 pour 18%)
   */
  static calculateFromTtc(totalIncludingTax: number, taxRate = DEFAULT_VAT_RATE): PricingBreakdown {
    const safeAmount = Math.max(0, totalIncludingTax)
    const safeRate = Math.max(0, taxRate)

    const subtotalExcludingTax = safeRate > 0
      ? roundCurrency(safeAmount / (1 + safeRate))
      : roundCurrency(safeAmount)

    const taxAmount = roundCurrency(subtotalExcludingTax * safeRate)

    return {
      subtotalExcludingTax,
      taxAmount,
      totalIncludingTax: roundCurrency(safeAmount),
    }
  }
}
