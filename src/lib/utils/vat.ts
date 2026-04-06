import Decimal from 'decimal.js'

export interface VATBreakdown {
  subtotal: Decimal  // price excluding VAT
  vat: Decimal       // VAT component
  total: Decimal     // original VAT-inclusive price
}

/**
 * Back-calculate VAT from a VAT-inclusive total.
 * Thai standard: prices displayed include 7% VAT.
 * Formula: vat = total * rate / (100 + rate)
 */
export function calculateVAT(totalInclusive: Decimal | number | string, rate: number = 7): VATBreakdown {
  const total = new Decimal(totalInclusive)
  const vat = total.mul(rate).div(new Decimal(100).plus(rate)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const subtotal = total.minus(vat)
  return { subtotal, vat, total }
}

/** @deprecated Use calculateVAT instead */
export const backCalculateVAT = calculateVAT
