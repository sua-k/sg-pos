import { describe, it, expect } from 'vitest'

function calculateAge(dateOfBirth: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = referenceDate.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dateOfBirth.getDate())) {
    age -= 1
  }
  return age
}

function meetsMinimumAge(dateOfBirth: Date, minAge: number = 20, referenceDate: Date = new Date()): boolean {
  return calculateAge(dateOfBirth, referenceDate) >= minAge
}

const REF = new Date('2026-01-01')

describe('calculateAge', () => {
  it('returns correct age for a birthday already passed this year', () => {
    const dob = new Date('2000-06-15')
    expect(calculateAge(dob, new Date('2026-08-01'))).toBe(26)
  })

  it('returns correct age for a birthday not yet reached this year', () => {
    const dob = new Date('2000-06-15')
    expect(calculateAge(dob, new Date('2026-04-01'))).toBe(25)
  })

  it('returns correct age on exact birthday', () => {
    const dob = new Date('2000-01-01')
    expect(calculateAge(dob, REF)).toBe(26)
  })

  it('returns 0 for newborn', () => {
    const dob = new Date('2025-12-31')
    expect(calculateAge(dob, REF)).toBe(0)
  })
})

describe('meetsMinimumAge', () => {
  it('returns true for customer exactly 20 years old', () => {
    const dob = new Date('2006-01-01')
    expect(meetsMinimumAge(dob, 20, REF)).toBe(true)
  })

  it('returns false for customer who is 19', () => {
    const dob = new Date('2007-01-02')
    expect(meetsMinimumAge(dob, 20, REF)).toBe(false)
  })

  it('returns true for customer older than minimum age', () => {
    const dob = new Date('1990-01-01')
    expect(meetsMinimumAge(dob, 20, REF)).toBe(true)
  })

  it('supports custom minimum age', () => {
    const dob = new Date('2008-01-01')
    expect(meetsMinimumAge(dob, 18, REF)).toBe(true)
    expect(meetsMinimumAge(dob, 20, REF)).toBe(false)
  })
})
