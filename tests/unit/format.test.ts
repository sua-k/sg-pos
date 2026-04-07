import { describe, it, expect } from 'vitest'
import { formatTHB, maskId } from '@/lib/utils/format'

describe('formatTHB', () => {
  it('formats integer amounts', () => {
    expect(formatTHB(1000)).toBe('฿1,000.00')
  })

  it('formats decimal amounts', () => {
    expect(formatTHB(1234.56)).toBe('฿1,234.56')
  })

  it('formats zero', () => {
    expect(formatTHB(0)).toBe('฿0.00')
  })

  it('handles string input', () => {
    expect(formatTHB('500')).toBe('฿500.00')
  })

  it('handles small amounts', () => {
    expect(formatTHB(0.5)).toBe('฿0.50')
  })
})

describe('maskId', () => {
  it('masks Thai national ID (13 digits)', () => {
    const result = maskId('1100700123456')
    expect(result.endsWith('3456')).toBe(true)
    expect(result).not.toContain('110070012')
    expect(result.length).toBe(13)
  })

  it('masks passport number', () => {
    const result = maskId('P12345678')
    expect(result.endsWith('5678')).toBe(true)
    expect(result.length).toBe(9)
  })

  it('returns short IDs as-is', () => {
    expect(maskId('1234')).toBe('1234')
    expect(maskId('AB')).toBe('AB')
  })
})
