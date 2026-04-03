import { differenceInYears } from 'date-fns'

/**
 * Calculate age from date of birth.
 */
export function calculateAge(dob: Date): number {
  return differenceInYears(new Date(), dob)
}

/**
 * Check if person meets minimum age requirement.
 * Thailand cannabis: must be >= 20 years old.
 */
export function isMinimumAge(dob: Date, minAge: number = 20): boolean {
  return calculateAge(dob) >= minAge
}
