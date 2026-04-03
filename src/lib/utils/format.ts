import Decimal from 'decimal.js'

/**
 * Format a number as Thai Baht.
 */
export function formatTHB(amount: Decimal | number | string): string {
  const num = new Decimal(amount).toNumber()
  return `\u0E3F${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Mask an ID number, showing only last 4 characters.
 * e.g., "1234567890123" -> "***********0123"
 */
export function maskId(idNumber: string): string {
  if (idNumber.length <= 4) return idNumber
  return '\u2022'.repeat(idNumber.length - 4) + idNumber.slice(-4)
}
