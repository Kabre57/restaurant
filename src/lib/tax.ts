import { DEFAULT_VAT_RATE } from '@/constants/taxes';
export { DEFAULT_VAT_RATE };

export type TaxBreakdown = {
  priceExcludingTax: number;
  taxRate: number;
  taxAmount: number;
  totalIncludingTax: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeTaxFromNetAmount(amountExcludingTax: number, taxRate = DEFAULT_VAT_RATE): TaxBreakdown {
  const safeAmount = Math.max(0, amountExcludingTax);
  const safeRate = Math.max(0, taxRate);
  const taxAmount = roundCurrency(safeAmount * safeRate);

  return {
    priceExcludingTax: roundCurrency(safeAmount),
    taxRate: safeRate,
    taxAmount,
    totalIncludingTax: roundCurrency(safeAmount + taxAmount),
  };
}

export function computeTaxFromGrossAmount(amountIncludingTax: number, taxRate = DEFAULT_VAT_RATE): TaxBreakdown {
  const safeAmount = Math.max(0, amountIncludingTax);
  const safeRate = Math.max(0, taxRate);
  const priceExcludingTax = safeRate > 0 ? roundCurrency(safeAmount / (1 + safeRate)) : roundCurrency(safeAmount);
  const taxAmount = roundCurrency(safeAmount - priceExcludingTax);

  return {
    priceExcludingTax,
    taxRate: safeRate,
    taxAmount,
    totalIncludingTax: roundCurrency(safeAmount),
  };
}
