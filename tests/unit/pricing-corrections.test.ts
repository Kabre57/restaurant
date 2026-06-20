import { describe, expect, it } from 'vitest'
import { OrderPricingService } from '@/services/order-pricing.service'
import { DEFAULT_VAT_RATE } from '@/lib/tax'

describe('OrderPricingService - Calcul de la TVA et du HT depuis le TTC', () => {
  it('calcule correctement le HT et la TVA pour un produit de 5500 FCFA avec TVA 18%', () => {
    const totalTtc = 5500
    const pricing = OrderPricingService.calculateFromTtc(totalTtc, 0.18)

    // HT = 5500 / 1.18 = 4661.0169... -> 4661.02
    expect(pricing.subtotalExcludingTax).toBe(4661.02)
    // TVA = 4661.0169... * 0.18 = 838.9830... -> 838.98
    expect(pricing.taxAmount).toBe(838.98)
    // Total TTC reste le total initial
    expect(pricing.totalIncludingTax).toBe(5500)
    // La somme HT + TVA est bien égale à TTC (4661.02 + 838.98 = 5500)
    expect(pricing.subtotalExcludingTax + pricing.taxAmount).toBe(5500)
  })

  it('calcule correctement le HT et la TVA avec le taux par défaut (18%)', () => {
    const totalTtc = 1000
    const pricing = OrderPricingService.calculateFromTtc(totalTtc)

    // HT = 1000 / 1.18 = 847.4576... -> 847.46
    expect(pricing.subtotalExcludingTax).toBe(847.46)
    // TVA = 847.46 * 0.18 = 152.54
    expect(pricing.taxAmount).toBe(152.54)
    expect(pricing.totalIncludingTax).toBe(1000)
    expect(pricing.subtotalExcludingTax + pricing.taxAmount).toBe(1000)
  })

  it('gère correctement les montants négatifs ou nuls', () => {
    const pricingZero = OrderPricingService.calculateFromTtc(0)
    expect(pricingZero.subtotalExcludingTax).toBe(0)
    expect(pricingZero.taxAmount).toBe(0)
    expect(pricingZero.totalIncludingTax).toBe(0)

    const pricingNegative = OrderPricingService.calculateFromTtc(-500)
    expect(pricingNegative.subtotalExcludingTax).toBe(0)
    expect(pricingNegative.taxAmount).toBe(0)
    expect(pricingNegative.totalIncludingTax).toBe(0)
  })
})

describe('Formatage et calcul des options / modificateurs', () => {
  it('calcule le prix final avec majorations des options', () => {
    const basePrice = 5000
    const selectedOptions = [
      { name: 'Supplément Fromage', price: 500 },
      { name: 'Taille XL', price: 1000 }
    ]

    const optionsPrice = selectedOptions.reduce((sum, opt) => sum + opt.price, 0)
    const finalPrice = basePrice + optionsPrice

    expect(finalPrice).toBe(6500)

    const pricing = OrderPricingService.calculateFromTtc(finalPrice)
    expect(pricing.totalIncludingTax).toBe(6500)
    expect(pricing.subtotalExcludingTax).toBe(5508.47) // 6500 / 1.18 = 5508.47
    expect(pricing.taxAmount).toBe(991.52) // 5508.47 * 0.18 = 991.52
  })
})
