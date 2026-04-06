import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'

function calculateVAT(subtotal: number, vatRate: number = 7): { vat: number; total: number } {
  const sub = new Decimal(subtotal)
  const vat = sub.mul(vatRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const total = sub.plus(vat)
  return { vat: vat.toNumber(), total: total.toNumber() }
}

function extractVATFromInclusivePrice(totalIncVat: number, vatRate: number = 7): { vat: number; subtotal: number } {
  const total = new Decimal(totalIncVat)
  const divisor = new Decimal(100 + vatRate)
  const vat = total.mul(vatRate).div(divisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const subtotal = total.minus(vat)
  return { vat: vat.toNumber(), subtotal: subtotal.toNumber() }
}

describe('calculateVAT', () => {
  it('adds 7% VAT to a subtotal', () => {
    const result = calculateVAT(100)
    expect(result.vat).toBe(7)
    expect(result.total).toBe(107)
  })

  it('rounds VAT to 2 decimal places', () => {
    const result = calculateVAT(33.33)
    expect(result.vat).toBe(2.33)
    expect(result.total).toBeCloseTo(35.66, 2)
  })

  it('returns zero VAT for zero subtotal', () => {
    const result = calculateVAT(0)
    expect(result.vat).toBe(0)
    expect(result.total).toBe(0)
  })

  it('supports custom VAT rate', () => {
    const result = calculateVAT(200, 10)
    expect(result.vat).toBe(20)
    expect(result.total).toBe(220)
  })

  it('handles large amounts', () => {
    const result = calculateVAT(10000)
    expect(result.vat).toBe(700)
    expect(result.total).toBe(10700)
  })
})

describe('extractVATFromInclusivePrice', () => {
  it('back-calculates 7% VAT from inclusive price', () => {
    const result = extractVATFromInclusivePrice(107)
    expect(result.vat).toBe(7)
    expect(result.subtotal).toBe(100)
  })

  it('handles a fractional inclusive price', () => {
    const result = extractVATFromInclusivePrice(321)
    // 321 / 1.07 = 300.00, vat = 21.00
    expect(result.vat).toBe(21)
    expect(result.subtotal).toBe(300)
  })
})
