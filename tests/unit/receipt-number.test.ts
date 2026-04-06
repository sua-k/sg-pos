import { describe, it, expect } from 'vitest'

function generateReceiptNumber(branchCode: string, sequence: number, date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = sequence.toString().padStart(4, '0')
  return `RCP-${branchCode}-${dateStr}-${seq}`
}

function generatePrescriptionNumber(branchCode: string, sequence: number, date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = sequence.toString().padStart(4, '0')
  return `RX-${branchCode}-${dateStr}-${seq}`
}

const FIXED_DATE = new Date('2026-04-06T00:00:00.000Z')

describe('generateReceiptNumber', () => {
  it('formats receipt number correctly', () => {
    const result = generateReceiptNumber('BKK01', 1, FIXED_DATE)
    expect(result).toBe('RCP-BKK01-20260406-0001')
  })

  it('pads sequence to 4 digits', () => {
    expect(generateReceiptNumber('BKK01', 42, FIXED_DATE)).toBe('RCP-BKK01-20260406-0042')
    expect(generateReceiptNumber('BKK01', 999, FIXED_DATE)).toBe('RCP-BKK01-20260406-0999')
    expect(generateReceiptNumber('BKK01', 1000, FIXED_DATE)).toBe('RCP-BKK01-20260406-1000')
  })

  it('includes branch code in the number', () => {
    const result = generateReceiptNumber('SUKM', 5, FIXED_DATE)
    expect(result).toContain('SUKM')
  })

  it('has the correct format structure', () => {
    const result = generateReceiptNumber('BKK01', 1, FIXED_DATE)
    expect(result).toMatch(/^RCP-[A-Z0-9]+-\d{8}-\d{4}$/)
  })
})

describe('generatePrescriptionNumber', () => {
  it('formats prescription number correctly', () => {
    const result = generatePrescriptionNumber('BKK01', 1, FIXED_DATE)
    expect(result).toBe('RX-BKK01-20260406-0001')
  })

  it('pads sequence to 4 digits', () => {
    expect(generatePrescriptionNumber('BKK01', 7, FIXED_DATE)).toBe('RX-BKK01-20260406-0007')
    expect(generatePrescriptionNumber('BKK01', 100, FIXED_DATE)).toBe('RX-BKK01-20260406-0100')
  })

  it('has the correct format structure', () => {
    const result = generatePrescriptionNumber('BKK01', 1, FIXED_DATE)
    expect(result).toMatch(/^RX-[A-Z0-9]+-\d{8}-\d{4}$/)
  })
})
