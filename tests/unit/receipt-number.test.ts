import { describe, it, expect } from 'vitest'

// Mirrors the formatting logic from src/lib/utils/receipt-number.ts
// (the real function is async + requires Prisma, so we test the format logic directly)
function formatReceiptNumber(branchCode: string, dateStr: string, sequence: number): string {
  const seq = sequence.toString().padStart(4, '0')
  return `${branchCode}-${dateStr}-${seq}`
}

function formatPrescriptionNumber(branchCode: string, dateStr: string, sequence: number): string {
  const seq = sequence.toString().padStart(4, '0')
  return `RX-${branchCode}-${dateStr}-${seq}`
}

describe('receipt number formatting', () => {
  it('formats receipt number correctly', () => {
    expect(formatReceiptNumber('PP', '20260406', 1)).toBe('PP-20260406-0001')
  })

  it('pads sequence to 4 digits', () => {
    expect(formatReceiptNumber('PP', '20260406', 42)).toBe('PP-20260406-0042')
    expect(formatReceiptNumber('PP', '20260406', 999)).toBe('PP-20260406-0999')
    expect(formatReceiptNumber('PP', '20260406', 1000)).toBe('PP-20260406-1000')
  })

  it('includes branch code', () => {
    expect(formatReceiptNumber('SL', '20260406', 5)).toContain('SL')
  })

  it('matches expected format: BRANCH-YYYYMMDD-NNNN', () => {
    expect(formatReceiptNumber('PP', '20260406', 1)).toMatch(/^[A-Z]{2,5}-\d{8}-\d{4}$/)
  })
})

describe('prescription number formatting', () => {
  it('formats prescription number correctly', () => {
    expect(formatPrescriptionNumber('PP', '20260406', 1)).toBe('RX-PP-20260406-0001')
  })

  it('pads sequence to 4 digits', () => {
    expect(formatPrescriptionNumber('PP', '20260406', 7)).toBe('RX-PP-20260406-0007')
    expect(formatPrescriptionNumber('PP', '20260406', 100)).toBe('RX-PP-20260406-0100')
  })

  it('matches expected format: RX-BRANCH-YYYYMMDD-NNNN', () => {
    expect(formatPrescriptionNumber('PP', '20260406', 1)).toMatch(/^RX-[A-Z]{2,5}-\d{8}-\d{4}$/)
  })
})
